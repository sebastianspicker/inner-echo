import { beforeEach, describe, expect, it, vi } from 'vitest'

const webgl = vi.hoisted(() => ({
  start: vi.fn(),
}))

vi.mock('../src/engine/canvas/webglPipeline', () => ({
  startWebGLOverlayLoop: webgl.start,
}))

import { startOverlayLoop } from '../src/engine/canvas'

function canvasWithContext(context: CanvasRenderingContext2D | null): HTMLCanvasElement {
  return {
    hidden: false,
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
  } as unknown as HTMLCanvasElement
}

describe('canvas renderer fallback ownership', () => {
  beforeEach(() => {
    webgl.start.mockReset()
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  it('uses the dedicated 2D canvas when WebGL startup fails', () => {
    webgl.start.mockReturnValue(null)
    const webglCanvas = canvasWithContext(null)
    const context2d = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    const fallbackCanvas = canvasWithContext(context2d)
    const video = { readyState: 2, videoWidth: 640, videoHeight: 480 } as HTMLVideoElement
    const container = { clientWidth: 320, clientHeight: 240 } as HTMLElement

    const control = startOverlayLoop(video, webglCanvas, fallbackCanvas, container)

    expect(control.getDiagnostics?.().rendererMode).toBe('2d')
    expect(webglCanvas.hidden).toBe(true)
    expect(fallbackCanvas.hidden).toBe(false)
    expect(fallbackCanvas.getContext).toHaveBeenCalledWith('2d')
    expect(fallbackCanvas.getContext).toHaveBeenCalledTimes(1)
    control.stop()
    expect(fallbackCanvas.hidden).toBe(true)
  })

  it('falls through to truthful raw-video mode when 2D is also unavailable', () => {
    webgl.start.mockReturnValue(null)
    const webglCanvas = canvasWithContext(null)
    const fallbackCanvas = canvasWithContext(null)

    const control = startOverlayLoop(
      {} as HTMLVideoElement,
      webglCanvas,
      fallbackCanvas,
      {} as HTMLElement,
    )

    expect(control.getDiagnostics?.().rendererMode).toBe('raw')
    expect(webglCanvas.hidden).toBe(true)
    expect(fallbackCanvas.hidden).toBe(true)
  })

  it('moves context-loss fallback to the separate 2D canvas and cleans it up', () => {
    let fail: (() => void) | undefined
    const stopWebgl = vi.fn()
    webgl.start.mockImplementation((_video, _canvas, _container, _nodes, _reactive, callbacks) => {
      fail = () => callbacks.onFatalRuntimeError(new Error('context lost'))
      return {
        stop: stopWebgl,
        setParams: vi.fn(),
        getDiagnostics: () => ({ rendererMode: 'webgl' }),
      }
    })
    const webglCanvas = canvasWithContext(null)
    const fallbackCanvas = canvasWithContext({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)

    const control = startOverlayLoop(
      {} as HTMLVideoElement,
      webglCanvas,
      fallbackCanvas,
      {} as HTMLElement,
    )
    expect(control.getDiagnostics?.().rendererMode).toBe('webgl')

    fail?.()
    expect(control.getDiagnostics?.().rendererMode).toBe('2d')
    expect(webglCanvas.hidden).toBe(true)
    expect(fallbackCanvas.hidden).toBe(false)

    control.stop()
    expect(fallbackCanvas.hidden).toBe(true)
  })

  it('reports unavailable when there is no video source', () => {
    const control = startOverlayLoop(null, canvasWithContext(null), canvasWithContext(null), null)
    expect(control.getDiagnostics?.().rendererMode).toBe('unavailable')
  })
})
