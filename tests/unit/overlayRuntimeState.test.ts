import { beforeEach, describe, expect, it, vi } from 'vitest'

const start2DOverlayLoopMock = vi.hoisted(() => vi.fn())
const startWebGLOverlayLoopMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/engine/canvas/overlayRenderer', () => ({
  startOverlayLoop: start2DOverlayLoopMock,
  syncCanvasToContainer: vi.fn(),
}))

vi.mock('../../src/engine/canvas/webglPipeline', () => ({
  startWebGLOverlayLoop: startWebGLOverlayLoopMock,
}))

import { startOverlayLoop, type OverlayRuntimeState } from '../../src/engine/canvas'
import type { VideoNode } from '../../src/engine/effects/VideoNode'
import type { WebGLOverlayCallbacks } from '../../src/engine/canvas/webglPipeline'

const video = {} as HTMLVideoElement
const canvas = {} as HTMLCanvasElement
const fallbackCanvas = {} as HTMLCanvasElement
const container = {} as HTMLElement

function webglControl() {
  return {
    stop: vi.fn(),
    setParams: vi.fn(),
    getDiagnostics: vi.fn(() => ({
      rendererMode: 'webgl' as const,
      fps: 60,
      frameTimeMs: 16.67,
      renderScale: 1,
      resourceCounts: {
        renderTargets: 1,
        temporalPairs: 0,
        estimatedTextures: 2,
        estimatedFramebuffers: 1,
      },
      activeVideoNodes: ['grain'],
    })),
  }
}

function startLoop(onStateChange: (state: OverlayRuntimeState) => void) {
  return startOverlayLoop(video, canvas, fallbackCanvas, container, [{} as VideoNode], null, {
    onStateChange,
  })
}

describe('canvas overlay runtime state', () => {
  beforeEach(() => {
    start2DOverlayLoopMock.mockReset()
    startWebGLOverlayLoopMock.mockReset()
  })

  it('reports WebGL effects active only when the renderer has effect nodes', () => {
    startWebGLOverlayLoopMock.mockReturnValue(webglControl())
    const onStateChange = vi.fn<(state: OverlayRuntimeState) => void>()

    const control = startLoop(onStateChange)

    expect(onStateChange).toHaveBeenLastCalledWith({
      rendererMode: 'webgl',
      effectsActive: true,
      error: null,
    })
    expect(control.getDiagnostics?.().effectsActive).toBe(true)
  })

  it('reports 2D fallback with effects inactive when WebGL initialization fails', () => {
    startWebGLOverlayLoopMock.mockReturnValue(null)
    start2DOverlayLoopMock.mockReturnValue(vi.fn())
    const onStateChange = vi.fn<(state: OverlayRuntimeState) => void>()

    const control = startLoop(onStateChange)

    expect(onStateChange).toHaveBeenLastCalledWith({
      rendererMode: '2d',
      effectsActive: false,
      error: null,
    })
    expect(control.getDiagnostics?.().rendererMode).toBe('2d')
  })

  it('reports raw video after context loss when a 2D context is unavailable', () => {
    let callbacks: WebGLOverlayCallbacks | undefined
    startWebGLOverlayLoopMock.mockImplementation((...args: unknown[]) => {
      callbacks = (args[0] as { callbacks?: WebGLOverlayCallbacks }).callbacks
      return webglControl()
    })
    start2DOverlayLoopMock.mockReturnValue(null)
    const onStateChange = vi.fn<(state: OverlayRuntimeState) => void>()
    const control = startLoop(onStateChange)
    const error = new Error('WebGL context lost. Render loop stopped.')

    callbacks?.onFatalRuntimeError?.(error)

    expect(onStateChange).toHaveBeenLastCalledWith({
      rendererMode: 'raw',
      effectsActive: false,
      error,
    })
    expect(control.getDiagnostics?.()).toMatchObject({
      rendererMode: 'raw',
      effectsActive: false,
      activeVideoNodes: [],
    })
  })

  it('reports unavailable when required runtime elements are absent', () => {
    const onStateChange = vi.fn<(state: OverlayRuntimeState) => void>()

    const control = startOverlayLoop(null, canvas, fallbackCanvas, container, [], null, {
      onStateChange,
    })

    expect(onStateChange).toHaveBeenCalledWith({
      rendererMode: 'unavailable',
      effectsActive: false,
      error: null,
    })
    expect(control.getDiagnostics?.().rendererMode).toBe('unavailable')
  })
})
