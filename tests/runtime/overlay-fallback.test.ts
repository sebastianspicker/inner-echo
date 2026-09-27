// @vitest-environment jsdom
//
// Characterizes createOverlayRuntime's truthful renderer fallback contract
// (docs/ARCHITECTURE.md "overlay: renderer webgl, 2d, raw, or unavailable, plus effectsActive").
import { describe, expect, it, vi } from 'vitest'
import {
  createOverlayRuntime,
  type OverlayRuntimeElements,
} from '../../src/runtime/visual/overlay/overlayRuntime'
import type { WebGLOverlayControl } from '../../src/runtime/visual/overlay/webglPipeline'
import type { WebGLDiagnostics } from '../../src/runtime/visual/overlay/webgl/diagnostics'

function createElements(withFallbackCanvas: boolean): OverlayRuntimeElements {
  return {
    video: document.createElement('video'),
    webglCanvas: document.createElement('canvas'),
    fallbackCanvas: withFallbackCanvas ? document.createElement('canvas') : null,
    container: document.createElement('div'),
  }
}

function stubWorkingCanvas2dContext(canvas: HTMLCanvasElement): void {
  const context = { clearRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D
  canvas.getContext = vi.fn(() => context) as unknown as typeof canvas.getContext
}

function createFakeDiagnostics(): WebGLDiagnostics {
  return {
    rendererMode: 'webgl',
    fps: 60,
    frameTimeMs: 16.6,
    renderScale: 1,
    resourceCounts: {
      renderTargets: 0,
      temporalPairs: 0,
      estimatedTextures: 0,
      estimatedFramebuffers: 0,
    },
    activeVideoNodes: [],
  }
}

function createFakeWebglControl(): WebGLOverlayControl {
  return {
    stop: vi.fn(),
    setParams: vi.fn(),
    getDiagnostics: vi.fn(createFakeDiagnostics),
  }
}

describe('install2dFallback', () => {
  it('reports 2d with effects inactive once a real 2D loop starts', () => {
    const elements = createElements(true)
    if (!elements.fallbackCanvas) throw new Error('expected a fallback canvas')
    stubWorkingCanvas2dContext(elements.fallbackCanvas)
    const states: string[] = []
    const runtime = createOverlayRuntime(elements, {
      onStateChange: (state) => states.push(state.rendererMode),
    })

    runtime.install2dFallback()

    expect(states).toEqual(['2d'])
    expect(runtime.control.getDiagnostics?.()).toMatchObject({
      rendererMode: '2d',
      effectsActive: false,
    })
    expect(elements.fallbackCanvas.hidden).toBe(false)
    expect(elements.webglCanvas?.hidden).toBe(true)
    runtime.control.stop()
  })

  it('reports raw when there is no fallback canvas to draw into', () => {
    const elements = createElements(false)
    const runtime = createOverlayRuntime(elements)

    runtime.install2dFallback()

    expect(runtime.control.getDiagnostics?.()).toMatchObject({
      rendererMode: 'raw',
      effectsActive: false,
    })
  })

  it('reports raw when the fallback canvas cannot produce a 2D context', () => {
    const elements = createElements(true)
    const runtime = createOverlayRuntime(elements)

    runtime.install2dFallback()

    expect(runtime.control.getDiagnostics?.()).toMatchObject({
      rendererMode: 'raw',
      effectsActive: false,
    })
  })
})

describe('installWebgl', () => {
  it.each([true, false])('reports webgl with effectsActive %s from the flag passed', (active) => {
    const runtime = createOverlayRuntime(createElements(false))
    const control = createFakeWebglControl()

    runtime.installWebgl(control, active)

    expect(runtime.control.getDiagnostics?.()).toMatchObject({
      rendererMode: 'webgl',
      effectsActive: active,
    })
  })
})

describe('stop', () => {
  it('is idempotent and hides both canvases', () => {
    const elements = createElements(false)
    const runtime = createOverlayRuntime(elements)
    const control = createFakeWebglControl()
    runtime.installWebgl(control, true)

    runtime.control.stop()
    runtime.control.stop()

    expect(control.stop).toHaveBeenCalledOnce()
    expect(elements.webglCanvas?.hidden).toBe(true)
  })
})
