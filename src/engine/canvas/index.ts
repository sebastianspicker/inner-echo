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
  renderScale: number
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

  if (!video || !canvas || !container) {
    return { stop: () => {}, setParams: noOpSetParams }
  }

  if (USE_WEBGL) {
    const control = startWebGLOverlayLoop(
      video,
      canvas,
      container,
      nodes,
      reactiveOptions ?? undefined
    )
    if (control) {
      return {
        stop: control.stop,
        setParams: control.setParams,
        getDiagnostics: () => control.getDiagnostics(),
      }
    }
  }

  const stop = start2DOverlayLoop(video, canvas, container)
  return {
    stop,
    setParams: noOpSetParams,
    getDiagnostics: () => ({
      rendererMode: '2d',
      fps: null,
      renderScale: 1,
    }),
  }
}
