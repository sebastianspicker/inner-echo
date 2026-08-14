import { startOverlayLoop as start2DOverlayLoop } from './overlayRenderer'
import type {
  OverlayControl,
  OverlayDiagnostics,
  OverlayRuntimeCallbacks,
  OverlayRuntimeState,
} from './index'
import type { WebGLOverlayControl } from './webglPipeline'

export interface OverlayRuntimeDelegate {
  control: OverlayControl
  reportUnavailable(): void
  install2dFallback(error?: Error | null): void
  installWebgl(control: WebGLOverlayControl, effectsActive: boolean): void
}

export interface OverlayRuntimeElements {
  video: HTMLVideoElement | null
  webglCanvas: HTMLCanvasElement | null
  fallbackCanvas: HTMLCanvasElement | null
  container: HTMLElement | null
}

const noOp = (): void => {}

function inactiveDiagnostics(rendererMode: 'raw' | 'unavailable'): OverlayDiagnostics {
  return {
    rendererMode,
    effectsActive: false,
    fps: null,
    frameTimeMs: null,
    renderScale: 1,
    resourceCounts: null,
    activeVideoNodes: [],
  }
}

function fallbackDiagnostics(): OverlayDiagnostics {
  return { ...inactiveDiagnostics('raw'), rendererMode: '2d' }
}

export function createOverlayRuntime(
  elements: OverlayRuntimeElements,
  callbacks?: OverlayRuntimeCallbacks,
): OverlayRuntimeDelegate {
  const { video, webglCanvas, fallbackCanvas, container } = elements
  let delegateStop: OverlayControl['stop'] = noOp
  let delegateSetParams: OverlayControl['setParams'] = noOp
  let delegateGetDiagnostics: NonNullable<OverlayControl['getDiagnostics']> = () =>
    inactiveDiagnostics('raw')
  let stopped = false
  let fallbackInstalled = false

  const showCanvas = (active: HTMLCanvasElement | null): void => {
    if (webglCanvas) webglCanvas.hidden = active !== webglCanvas
    if (fallbackCanvas) fallbackCanvas.hidden = active !== fallbackCanvas
  }

  const notify = (state: OverlayRuntimeState): void => callbacks?.onStateChange?.(state)

  const control: OverlayControl = {
    stop: () => {
      if (stopped) return
      stopped = true
      delegateStop()
      showCanvas(null)
    },
    setParams: (params) => delegateSetParams(params),
    getDiagnostics: () => delegateGetDiagnostics(),
  }

  return {
    control,
    reportUnavailable() {
      showCanvas(null)
      delegateGetDiagnostics = () => inactiveDiagnostics('unavailable')
      notify({ rendererMode: 'unavailable', effectsActive: false, error: null })
    },
    install2dFallback(error = null) {
      if (stopped || fallbackInstalled) return
      fallbackInstalled = true
      const stop2d = start2DOverlayLoop(video, fallbackCanvas, container)
      delegateStop = stop2d ?? noOp
      delegateSetParams = noOp
      delegateGetDiagnostics = stop2d ? fallbackDiagnostics : () => inactiveDiagnostics('raw')
      showCanvas(stop2d ? fallbackCanvas : null)
      notify({ rendererMode: stop2d ? '2d' : 'raw', effectsActive: false, error })
    },
    installWebgl(webglControl, effectsActive) {
      showCanvas(webglCanvas)
      delegateStop = () => webglControl.stop()
      delegateSetParams = (params) => webglControl.setParams(params)
      delegateGetDiagnostics = () => ({ ...webglControl.getDiagnostics(), effectsActive })
      notify({ rendererMode: 'webgl', effectsActive, error: null })
    },
  }
}
