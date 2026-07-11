/**
 * Canvas overlay: WebGL (Three.js) by default with 2D fallback.
 * WebGL receives condition-built video nodes; empty nodes mean passthrough.
 * Reactive options let the frame loop exchange video/audio metrics with WebAudio.
 */

import type { VideoNode } from '../effects/VideoNode'
import { startOverlayLoop as start2DOverlayLoop, syncCanvasToContainer } from './overlayRenderer'
import {
  startWebGLOverlayLoop,
  type WebGLOverlayCallbacks,
  type VideoPipelineParams,
  type ReactiveLoopOptions,
} from './webglPipeline'

export { syncCanvasToContainer }
export type { VideoPipelineParams, ReactiveLoopOptions }
export type { VideoMetrics } from './videoMetrics'

export type OverlayRendererMode = 'webgl' | '2d' | 'raw' | 'unavailable'

export interface OverlayRuntimeState {
  rendererMode: OverlayRendererMode
  effectsActive: boolean
  error: Error | null
}

export interface OverlayRuntimeCallbacks {
  onStateChange?(state: OverlayRuntimeState): void
}

/** Diagnostics exposed to the dev debug panel while an overlay is active. */
export interface OverlayDiagnostics {
  rendererMode: OverlayRendererMode
  effectsActive: boolean
  fps: number | null
  frameTimeMs: number | null
  renderScale: number
  resourceCounts: {
    renderTargets: number
    temporalPairs: number
    estimatedTextures: number
    estimatedFramebuffers: number
  } | null
  activeVideoNodes: string[]
}

/** When true, use Three.js WebGL pipeline; when false or when WebGL init fails, use 2D drawImage. */
const USE_WEBGL = true

export interface OverlayControl {
  stop(): void
  setParams(params: VideoPipelineParams): void
  /** Present only when overlay is active; used by the dev debug panel. */
  getDiagnostics?(): OverlayDiagnostics
}

/**
 * Start the overlay render loop. Prefers WebGL (Three.js) with the given video nodes
 * (from condition profile); empty or missing nodes = clean passthrough.
 * Falls back to 2D canvas drawImage if USE_WEBGL is false or WebGL init fails.
 * Pass reactiveOptions to drive AV coupling from audio/video metrics.
 * Returns { stop, setParams }; setParams is a no-op for 2D fallback.
 */
export function startOverlayLoop(
  video: HTMLVideoElement | null,
  webglCanvas: HTMLCanvasElement | null,
  fallbackCanvas: HTMLCanvasElement | null,
  container: HTMLElement | null,
  nodes: VideoNode[] = [],
  reactiveOptions?: ReactiveLoopOptions | null,
  runtimeCallbacks?: OverlayRuntimeCallbacks,
): OverlayControl {
  const noOpSetParams: OverlayControl['setParams'] = () => {}
  const get2dDiagnostics = (): OverlayDiagnostics => ({
    rendererMode: '2d',
    effectsActive: false,
    fps: null,
    frameTimeMs: null,
    renderScale: 1,
    resourceCounts: null,
    activeVideoNodes: [],
  })
  const getInactiveDiagnostics = (rendererMode: 'raw' | 'unavailable'): OverlayDiagnostics => ({
    rendererMode,
    effectsActive: false,
    fps: null,
    frameTimeMs: null,
    renderScale: 1,
    resourceCounts: null,
    activeVideoNodes: [],
  })

  const showCanvas = (active: HTMLCanvasElement | null): void => {
    if (webglCanvas) webglCanvas.hidden = active !== webglCanvas
    if (fallbackCanvas) fallbackCanvas.hidden = active !== fallbackCanvas
  }

  if (!video || !container) {
    showCanvas(null)
    const diagnostics = getInactiveDiagnostics('unavailable')
    runtimeCallbacks?.onStateChange?.({
      rendererMode: diagnostics.rendererMode,
      effectsActive: false,
      error: null,
    })
    return { stop: () => {}, setParams: noOpSetParams, getDiagnostics: () => diagnostics }
  }

  let delegateStop: OverlayControl['stop'] = () => {}
  let delegateSetParams: OverlayControl['setParams'] = noOpSetParams
  let delegateGetDiagnostics: NonNullable<OverlayControl['getDiagnostics']> = () =>
    getInactiveDiagnostics('raw')
  let stopped = false
  let fallbackInstalled = false

  const install2dFallback = (error: Error | null = null): void => {
    if (stopped || fallbackInstalled) return
    fallbackInstalled = true
    const stop2d = start2DOverlayLoop(video, fallbackCanvas, container)
    delegateStop = stop2d ?? (() => {})
    delegateSetParams = noOpSetParams
    delegateGetDiagnostics = stop2d ? get2dDiagnostics : () => getInactiveDiagnostics('raw')
    showCanvas(stop2d ? fallbackCanvas : null)
    runtimeCallbacks?.onStateChange?.({
      rendererMode: stop2d ? '2d' : 'raw',
      effectsActive: false,
      error,
    })
  }

  if (USE_WEBGL && webglCanvas) {
    let switchedTo2d = false
    const callbacks: WebGLOverlayCallbacks = {
      onFatalRuntimeError(error) {
        if (switchedTo2d) return
        switchedTo2d = true
        install2dFallback(error)
      },
    }
    const control = startWebGLOverlayLoop(
      video,
      webglCanvas,
      container,
      nodes,
      reactiveOptions ?? undefined,
      callbacks,
    )
    if (control) {
      showCanvas(webglCanvas)
      delegateStop = () => control.stop()
      delegateSetParams = (params) => control.setParams(params)
      const effectsActive = nodes.length > 0
      delegateGetDiagnostics = () => ({ ...control.getDiagnostics(), effectsActive })
      runtimeCallbacks?.onStateChange?.({ rendererMode: 'webgl', effectsActive, error: null })
      return {
        stop: () => {
          if (stopped) return
          stopped = true
          delegateStop()
          showCanvas(null)
        },
        setParams: (params) => delegateSetParams(params),
        getDiagnostics: () => delegateGetDiagnostics(),
      }
    }
  }

  install2dFallback()
  return {
    stop: () => {
      if (stopped) return
      stopped = true
      delegateStop()
      showCanvas(null)
    },
    setParams: (params) => delegateSetParams(params),
    getDiagnostics: () => delegateGetDiagnostics(),
  }
}
