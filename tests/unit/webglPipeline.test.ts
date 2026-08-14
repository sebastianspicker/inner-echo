import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VideoNode, VideoNodeParams } from '../../src/engine/effects/VideoNode'

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

  class WebGLRenderTarget {
    dispose = vi.fn()
    texture = { id: `render-target-${webglState.renderTargets.length}` }

    constructor() {
      webglState.renderTargets.push(this)
    }
  }

  class Scene {
    add = vi.fn()
  }

  class OrthographicCamera {
    position = { z: 0 }
  }

  return {
    animationFrames: [] as FrameRequestCallback[],
    context: {
      NO_ERROR: 0,
      UNPACK_FLIP_Y_WEBGL: 0x9240,
      UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
      getError: vi.fn(() => 0),
      pixelStorei: vi.fn(),
    },
    geometryDispose: vi.fn(),
    materials: [] as MeshBasicMaterial[],
    metrics: {
      dispose: vi.fn(),
      getLast: vi.fn(() => ({ motion: 0.1, luminance: 0.2, edge: 0.3, instability: 0.4 })),
      stepFromSource: vi.fn(() => ({ motion: 0.5, luminance: 0.6, edge: 0.7, instability: 0.8 })),
    },
    renderQuad: vi.fn(),
    renderers: [] as WebGLRenderer[],
    renderTargets: [] as WebGLRenderTarget[],
    videoTextureError: null as Error | null,
    videoTextures: [] as VideoTexture[],
    Mesh,
    MeshBasicMaterial,
    OrthographicCamera,
    Scene,
    VideoTexture,
    WebGLRenderer,
    WebGLRenderTarget,
  }
})

vi.mock('three', () => ({
  LinearFilter: 'linear',
  Mesh: webglState.Mesh,
  MeshBasicMaterial: webglState.MeshBasicMaterial,
  OrthographicCamera: webglState.OrthographicCamera,
  Scene: webglState.Scene,
  SRGBColorSpace: 'srgb',
  RGBAFormat: 'rgba',
  UnsignedByteType: 'unsigned-byte',
  VideoTexture: webglState.VideoTexture,
  WebGLRenderer: webglState.WebGLRenderer,
  WebGLRenderTarget: webglState.WebGLRenderTarget,
}))
vi.mock('../../src/engine/canvas/webgl/renderHelpers', () => ({
  createPassthroughMaterial: () => new webglState.MeshBasicMaterial(),
  getQuadGeometry: () => ({ dispose: webglState.geometryDispose }),
  renderQuad: webglState.renderQuad,
  toNodeName: (node: { nodeName?: string }) => node.nodeName ?? 'mock-node',
}))
vi.mock('../../src/engine/canvas/videoMetrics', () => ({
  createVideoMetricsTracker: vi.fn(() => webglState.metrics),
}))
vi.mock('../../src/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}))

import { startWebGLOverlayLoop } from '../../src/engine/canvas/webglPipeline'

const requestAnimationFrameMock = vi.fn((callback: FrameRequestCallback) => {
  webglState.animationFrames.push(callback)
  return 41
})
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

function createVideo({ ready = true }: { ready?: boolean } = {}): HTMLVideoElement {
  return {
    readyState: ready ? 4 : 1,
    videoHeight: ready ? 720 : 0,
    videoWidth: ready ? 1280 : 0,
  } as HTMLVideoElement
}

function createContainer(width = 640, height = 360): HTMLElement {
  return { clientHeight: height, clientWidth: width } as HTMLElement
}

function runNextAnimationFrame(): void {
  const frame = webglState.animationFrames.shift()
  if (!frame) throw new Error('Expected the pipeline to schedule an animation frame.')
  frame(0)
}

function createNode({
  name,
  temporal = false,
  tick = false,
}: {
  name: string
  temporal?: boolean
  tick?: boolean
}): {
  dispose: ReturnType<typeof vi.fn>
  getMaterial: ReturnType<typeof vi.fn>
  node: VideoNode
  setParams: ReturnType<typeof vi.fn>
  tick: ReturnType<typeof vi.fn> | undefined
} {
  const setParams = vi.fn<(params: VideoNodeParams) => void>()
  const getMaterial = vi.fn(() => ({ name: `${name}-material` }))
  const dispose = vi.fn()
  const tickNode = tick ? vi.fn() : undefined
  const node = {
    dispose,
    getMaterial,
    needsPreviousFrame: temporal,
    nodeName: name,
    setParams,
    ...(tickNode ? { tick: tickNode } : {}),
  } as unknown as VideoNode
  return { dispose, getMaterial, node, setParams, tick: tickNode }
}

beforeEach(() => {
  webglState.animationFrames.length = 0
  webglState.geometryDispose.mockReset()
  webglState.materials.length = 0
  webglState.metrics.dispose.mockReset()
  webglState.metrics.getLast.mockReset().mockReturnValue({
    motion: 0.1,
    luminance: 0.2,
    edge: 0.3,
    instability: 0.4,
  })
  webglState.metrics.stepFromSource.mockReset().mockReturnValue({
    motion: 0.5,
    luminance: 0.6,
    edge: 0.7,
    instability: 0.8,
  })
  webglState.renderQuad.mockReset()
  webglState.renderers.length = 0
  webglState.renderTargets.length = 0
  webglState.videoTextureError = null
  webglState.videoTextures.length = 0
  webglState.context.getError.mockReset().mockReturnValue(0)
  webglState.context.pixelStorei.mockReset()
  requestAnimationFrameMock.mockClear()
  cancelAnimationFrameMock.mockClear()
  vi.spyOn(performance, 'now').mockReturnValue(100)
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock)
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock)
  vi.stubGlobal('window', { devicePixelRatio: 1 })
})

afterEach(() => {
  vi.restoreAllMocks()
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

  it('sizes, renders, requeues, and snapshots diagnostics for a ready passthrough video', () => {
    const control = startWebGLOverlayLoop({
      video: createVideo(),
      canvas: createCanvasHarness().canvas,
      container: createContainer(),
      nodes: [],
    })

    expect(control).not.toBeNull()
    runNextAnimationFrame()

    const renderer = webglState.renderers[0]
    expect(renderer?.setPixelRatio).toHaveBeenCalledWith(1)
    expect(renderer?.setSize).toHaveBeenCalledWith(640, 360)
    expect(renderer?.setRenderTarget).toHaveBeenCalledWith(null)
    expect(renderer?.render).toHaveBeenCalledOnce()
    expect(webglState.videoTextures[0]?.needsUpdate).toBe(true)
    expect(webglState.animationFrames).toHaveLength(1)
    expect(control?.getDiagnostics()).toMatchInlineSnapshot(`
      {
        "activeVideoNodes": [],
        "fps": 60,
        "frameTimeMs": 0,
        "renderScale": 1,
        "rendererMode": "webgl",
        "resourceCounts": {
          "estimatedFramebuffers": 0,
          "estimatedTextures": 1,
          "renderTargets": 0,
          "temporalPairs": 0,
        },
      }
    `)
  })

  it('runs a non-temporal chain with setParams and reactive video and audio overrides', () => {
    const node = createNode({ name: 'grain', tick: true })
    const audioMetrics = { rms: 0.42, centroid: 440, flux: 0.12 }
    const onVideoMetrics = vi.fn()
    const getOverrides = vi.fn(() => ({
      audio: { gain: 0.3 },
      video: { '0.amount': 0.9 },
    }))
    const applyAudioOverrides = vi.fn()
    const control = startWebGLOverlayLoop({
      video: createVideo(),
      canvas: createCanvasHarness().canvas,
      container: createContainer(),
      nodes: [node.node],
      reactiveOptions: {
        applyAudioOverrides,
        getAudioMetrics: () => audioMetrics,
        getOverrides,
        onVideoMetrics,
      },
    })

    control?.setParams({
      controlValues: { '0.amount': 0.2, enabled: false },
      intensity: 0.8,
      safeMode: true,
    })
    runNextAnimationFrame()

    expect(onVideoMetrics).toHaveBeenCalledWith({
      motion: 0.5,
      luminance: 0.6,
      edge: 0.7,
      instability: 0.8,
    })
    expect(getOverrides).toHaveBeenCalledWith(
      0,
      audioMetrics,
      { motion: 0.5, luminance: 0.6, edge: 0.7, instability: 0.8 },
      { '0.amount': 0.2, enabled: false },
    )
    expect(applyAudioOverrides).toHaveBeenCalledWith({ gain: 0.3 })
    expect(node.setParams).toHaveBeenCalledWith({
      controlValues: { '0.amount': 0.9, enabled: false },
      intensity: 0.8,
      nodeIndex: 0,
      safeMode: true,
      safetyContext: undefined,
      uvOffset: [0, 0],
      uvScale: [1, 1],
    })
    expect(node.tick).toHaveBeenCalledWith(0)
    expect(node.getMaterial).toHaveBeenCalledWith(webglState.renderTargets[0]?.texture)
    expect(webglState.renderQuad.mock.calls.map(([, , , , target]) => target)).toEqual([
      webglState.renderTargets[0],
      webglState.renderTargets[1],
      null,
    ])
    expect(control?.getDiagnostics()).toMatchInlineSnapshot(`
      {
        "activeVideoNodes": [
          "grain",
        ],
        "fps": 60,
        "frameTimeMs": 0,
        "renderScale": 1,
        "rendererMode": "webgl",
        "resourceCounts": {
          "estimatedFramebuffers": 2,
          "estimatedTextures": 3,
          "renderTargets": 2,
          "temporalPairs": 0,
        },
      }
    `)
  })

  it('ping-pongs a temporal chain and disposes every runtime resource once in cleanup order', () => {
    const node = createNode({ name: 'smear', temporal: true, tick: true })
    const { canvas } = createCanvasHarness()
    const control = startWebGLOverlayLoop({
      video: createVideo(),
      canvas,
      container: createContainer(),
      nodes: [node.node],
    })

    runNextAnimationFrame()
    runNextAnimationFrame()

    const [input, output, previous, current] = webglState.renderTargets
    expect(node.getMaterial).toHaveBeenNthCalledWith(1, input?.texture, input?.texture)
    expect(node.getMaterial).toHaveBeenNthCalledWith(2, input?.texture, previous?.texture)
    expect(webglState.renderQuad.mock.calls.map(([, , , , target]) => target)).toEqual([
      input,
      previous,
      null,
      input,
      current,
      null,
    ])
    expect(control?.getDiagnostics()).toMatchInlineSnapshot(`
      {
        "activeVideoNodes": [
          "smear",
        ],
        "fps": 60,
        "frameTimeMs": 0,
        "renderScale": 1,
        "rendererMode": "webgl",
        "resourceCounts": {
          "estimatedFramebuffers": 4,
          "estimatedTextures": 5,
          "renderTargets": 4,
          "temporalPairs": 1,
        },
      }
    `)

    control?.stop()
    control?.stop()

    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(41)
    expect(canvas.removeEventListener).toHaveBeenCalledWith(
      'webglcontextlost',
      expect.any(Function),
    )
    expect(node.dispose).toHaveBeenCalledOnce()
    expect(webglState.materials.at(-1)?.dispose).toHaveBeenCalledOnce()
    for (const target of webglState.renderTargets) {
      expect(target.dispose).toHaveBeenCalledOnce()
    }
    expect(webglState.metrics.dispose).toHaveBeenCalledOnce()
    expect(webglState.videoTextures[0]?.dispose).toHaveBeenCalledOnce()
    expect(webglState.geometryDispose).toHaveBeenCalledOnce()
    expect(webglState.renderers[0]?.dispose).toHaveBeenCalledOnce()
    expect(node.dispose.mock.invocationCallOrder[0]).toBeLessThan(
      webglState.renderTargets[0]?.dispose.mock.invocationCallOrder[0] ?? Infinity,
    )
  })

  it('clears a not-ready video frame without executing effect nodes', () => {
    const node = createNode({ name: 'blocked' })
    const onVideoMetrics = vi.fn()
    startWebGLOverlayLoop({
      video: createVideo({ ready: false }),
      canvas: createCanvasHarness().canvas,
      container: createContainer(),
      nodes: [node.node],
      reactiveOptions: {
        getOverrides: vi.fn(() => ({ video: {} })),
        onVideoMetrics,
      },
    })

    runNextAnimationFrame()

    expect(webglState.metrics.getLast).toHaveBeenCalledOnce()
    expect(webglState.metrics.stepFromSource).not.toHaveBeenCalled()
    expect(onVideoMetrics).toHaveBeenCalledWith({
      motion: 0.1,
      luminance: 0.2,
      edge: 0.3,
      instability: 0.4,
    })
    expect(webglState.renderers[0]?.setRenderTarget).toHaveBeenCalledWith(null)
    expect(webglState.renderers[0]?.clear).toHaveBeenCalledOnce()
    expect(node.setParams).not.toHaveBeenCalled()
    expect(node.getMaterial).not.toHaveBeenCalled()
    expect(node.tick).toBeUndefined()
    expect(webglState.renderQuad).not.toHaveBeenCalled()
    expect(webglState.animationFrames).toHaveLength(1)
  })

  it('reports one fatal callback after three consecutive GL-error frames and fully cleans up', () => {
    const node = createNode({ name: 'faulty' })
    const onFatalRuntimeError = vi.fn()
    webglState.context.getError
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(0)
    const { canvas } = createCanvasHarness()
    const control = startWebGLOverlayLoop({
      video: createVideo(),
      canvas,
      container: createContainer(),
      nodes: [node.node],
      callbacks: { onFatalRuntimeError },
    })

    runNextAnimationFrame()
    runNextAnimationFrame()
    runNextAnimationFrame()
    control?.stop()

    expect(onFatalRuntimeError).toHaveBeenCalledOnce()
    expect(onFatalRuntimeError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Renderer switched to 2D fallback after repeated GPU errors.',
      }),
    )
    expect(webglState.animationFrames).toHaveLength(0)
    expect(canvas.removeEventListener).toHaveBeenCalledWith(
      'webglcontextlost',
      expect.any(Function),
    )
    expect(node.dispose).toHaveBeenCalledOnce()
    for (const target of webglState.renderTargets) {
      expect(target.dispose).toHaveBeenCalledOnce()
    }
    expect(webglState.videoTextures[0]?.dispose).toHaveBeenCalledOnce()
    expect(webglState.geometryDispose).toHaveBeenCalledOnce()
    expect(webglState.renderers[0]?.dispose).toHaveBeenCalledOnce()
  })
})
