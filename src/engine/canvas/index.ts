/**
 * Canvas overlay: WebGL (Three.js) by default with 2D fallback.
 * Phase 5: WebGL pipeline is built from condition profile (video nodes); empty nodes = passthrough.
 * Phase 8: Optional reactive options for audio RMS → video param modulation.
 * Phase 12: getDiagnostics() for dev debug panel.
 */

import type { VideoNode } from '../effects/VideoNode'
import {
  startOverlayLoop as start2DOverlayLoop,
  syncCanvasToContainer,
} from './overlayRenderer'
import {
  startWebGLOverlayLoop,
  type WebGLOverlayCallbacks,
  type VideoPipelineParams,
  type ReactiveLoopOptions,
} from './webglPipeline'

export { syncCanvasToContainer }
export type { VideoPipelineParams, ReactiveLoopOptions }
export type { VideoMetrics } from './videoMetrics'

/** Phase 12: Diagnostics for dev debug panel. */
export interface OverlayDiagnostics {
  rendererMode: 'webgl' | '2d'
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
  /** Phase 12: Present only when overlay is active; for dev debug panel. */
  getDiagnostics?(): OverlayDiagnostics
}

/**
 * Start the overlay render loop. Prefers WebGL (Three.js) with the given video nodes
 * (from condition profile); empty or missing nodes = clean passthrough.
 * Falls back to 2D canvas drawImage if USE_WEBGL is false or WebGL init fails.
 * Phase 8: Pass reactiveOptions to drive video params from audio RMS (getRms + getOverrides).
 * Returns { stop, setParams }; setParams is a no-op for 2D fallback.
 */
export function startOverlayLoop(
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement | null,
  container: HTMLElement | null,
  nodes: VideoNode[] = [],
  reactiveOptions?: ReactiveLoopOptions | null
): OverlayControl {
  const noOpSetParams: OverlayControl['setParams'] = () => {}
  const get2dDiagnostics = (): OverlayDiagnostics => ({
    rendererMode: '2d',
    fps: null,
    frameTimeMs: null,
    renderScale: 1,
    resourceCounts: null,
    activeVideoNodes: [],
  })

  if (!video || !canvas || !container) {
    return { stop: () => {}, setParams: noOpSetParams }
  }

  let delegateStop: OverlayControl['stop'] = () => {}
  let delegateSetParams: OverlayControl['setParams'] = noOpSetParams
  let delegateGetDiagnostics: NonNullable<OverlayControl['getDiagnostics']> = get2dDiagnostics

  const install2dFallback = (): void => {
    const stop2d = start2DOverlayLoop(video, canvas, container)
    delegateStop = stop2d
    delegateSetParams = noOpSetParams
    delegateGetDiagnostics = get2dDiagnostics
  }

  if (USE_WEBGL) {
    let switchedTo2d = false
    const callbacks: WebGLOverlayCallbacks = {
      onFatalRuntimeError() {
        if (switchedTo2d) return
        switchedTo2d = true
        install2dFallback()
      },
    }
    const control = startWebGLOverlayLoop(
      video,
      canvas,
      container,
      nodes,
      reactiveOptions ?? undefined,
      callbacks
    )
    if (control) {
      delegateStop = () => control.stop()
      delegateSetParams = (params) => control.setParams(params)
      delegateGetDiagnostics = () => control.getDiagnostics()
      return {
        stop: () => delegateStop(),
        setParams: (params) => delegateSetParams(params),
        getDiagnostics: () => delegateGetDiagnostics(),
      }
    }
  }

  install2dFallback()
  return {
    stop: () => delegateStop(),
    setParams: (params) => delegateSetParams(params),
    getDiagnostics: () => delegateGetDiagnostics(),
  }
}
