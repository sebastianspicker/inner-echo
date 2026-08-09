import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const webglState = vi.hoisted(() => {
  class WebGLRenderer {
    dispose = vi.fn()
    getContext = vi.fn(() => webglState.context)
    render = vi.fn()
    setPixelRatio = vi.fn()
    setRenderTarget = vi.fn()
    setSize = vi.fn()
    clear = vi.fn()

    constructor() {
      webglState.renderers.push(this)
    }
  }

  class VideoTexture {
    dispose = vi.fn()
    needsUpdate = false

    constructor() {
      if (webglState.videoTextureError) throw webglState.videoTextureError
      webglState.videoTextures.push(this)
    }
  }

  class MeshBasicMaterial {
    dispose = vi.fn()
    map: unknown = null
    needsUpdate = false

    constructor(_options?: unknown) {
      webglState.materials.push(this)
    }
  }

  class Mesh {}

  class Scene {
    add = vi.fn()
  }

  class OrthographicCamera {
    position = { z: 0 }
  }

  return {
    context: {
      NO_ERROR: 0,
      UNPACK_FLIP_Y_WEBGL: 0x9240,
      UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
      getError: vi.fn(() => 0),
      pixelStorei: vi.fn(),
    },
    geometryDispose: vi.fn(),
    materials: [] as MeshBasicMaterial[],
    renderers: [] as WebGLRenderer[],
    videoTextureError: null as Error | null,
    videoTextures: [] as VideoTexture[],
    Mesh,
    MeshBasicMaterial,
    OrthographicCamera,
    Scene,
    VideoTexture,
    WebGLRenderer,
  }
})

vi.mock('three', () => ({
  LinearFilter: 'linear',
  Mesh: webglState.Mesh,
  MeshBasicMaterial: webglState.MeshBasicMaterial,
  OrthographicCamera: webglState.OrthographicCamera,
  Scene: webglState.Scene,
  SRGBColorSpace: 'srgb',
  VideoTexture: webglState.VideoTexture,
  WebGLRenderer: webglState.WebGLRenderer,
}))
vi.mock('../../src/engine/canvas/webgl/renderHelpers', () => ({
  createPassthroughMaterial: () => new webglState.MeshBasicMaterial(),
  getQuadGeometry: () => ({ dispose: webglState.geometryDispose }),
  renderQuad: vi.fn(),
  toNodeName: () => 'mock-node',
}))
vi.mock('../../src/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}))

import { startWebGLOverlayLoop } from '../../src/engine/canvas/webglPipeline'

const requestAnimationFrameMock = vi.fn(() => 41)
const cancelAnimationFrameMock = vi.fn()

function createCanvasHarness(): {
  canvas: HTMLCanvasElement
  dispatchContextLoss: (event: { preventDefault: ReturnType<typeof vi.fn> }) => void
} {
  let onContextLost: ((event: { preventDefault: ReturnType<typeof vi.fn> }) => void) | undefined
  return {
    canvas: {
      addEventListener: vi.fn((type: string, callback: typeof onContextLost) => {
        if (type === 'webglcontextlost') onContextLost = callback
      }),
      removeEventListener: vi.fn(),
    } as unknown as HTMLCanvasElement,
    dispatchContextLoss: (event) => onContextLost?.(event),
  }
}

beforeEach(() => {
  webglState.geometryDispose.mockReset()
  webglState.materials.length = 0
  webglState.renderers.length = 0
  webglState.videoTextureError = null
  webglState.videoTextures.length = 0
  webglState.context.getError.mockClear()
  webglState.context.pixelStorei.mockClear()
  requestAnimationFrameMock.mockClear()
  cancelAnimationFrameMock.mockClear()
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock)
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('engine/canvas/webglPipeline lifecycle', () => {
  it('reports startup failure and disposes resources already created', () => {
    const error = new Error('Video texture initialization failed')
    const onFatalRuntimeError = vi.fn()
    webglState.videoTextureError = error
    const { canvas } = createCanvasHarness()

    const control = startWebGLOverlayLoop({
      video: {} as HTMLVideoElement,
      canvas,
      container: {} as HTMLElement,
      nodes: [],
      callbacks: { onFatalRuntimeError },
    })

    expect(control).toBeNull()
    expect(onFatalRuntimeError).toHaveBeenCalledWith(error)
    expect(webglState.renderers[0]?.dispose).toHaveBeenCalledOnce()
  })

  it('stops and cleans up the running loop when the WebGL context is lost', () => {
    const onFatalRuntimeError = vi.fn()
    const { canvas, dispatchContextLoss } = createCanvasHarness()
    const control = startWebGLOverlayLoop({
      video: {} as HTMLVideoElement,
      canvas,
      container: {} as HTMLElement,
      nodes: [],
      callbacks: { onFatalRuntimeError },
    })
    const event = { preventDefault: vi.fn() }

    expect(control).not.toBeNull()
    expect(requestAnimationFrameMock).toHaveBeenCalledOnce()

    dispatchContextLoss(event)

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(41)
    expect(webglState.renderers[0]?.dispose).toHaveBeenCalledOnce()
    expect(webglState.videoTextures[0]?.dispose).toHaveBeenCalledOnce()
    expect(webglState.geometryDispose).toHaveBeenCalledOnce()
    expect(onFatalRuntimeError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'WebGL context lost. Render loop stopped.' }),
    )

    control?.stop()
    expect(cancelAnimationFrameMock).toHaveBeenCalledOnce()
  })
})
