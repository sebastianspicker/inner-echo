/**
 * Canvas overlay: WebGL (Three.js) by default with 2D fallback.
 * WebGL receives condition-built video nodes; empty nodes mean passthrough.
 * Reactive options let the frame loop exchange video/audio metrics with WebAudio.
 */

import type { VideoNode } from '../effects/VideoNode'
import { syncCanvasToContainer } from './overlayRenderer'
import { createOverlayRuntime } from './overlayRuntime'
import {
  startWebGLOverlayLoop,
  type WebGLOverlayCallbacks,
  type VideoPipelineParams,
  type ReactiveLoopOptions,
} from './webglPipeline'
import type { OverlayControl, OverlayRuntimeCallbacks } from './contracts'

export { syncCanvasToContainer }
export type { VideoPipelineParams, ReactiveLoopOptions }
export type { VideoMetrics } from './videoMetrics'

export type {
  OverlayControl,
  OverlayDiagnostics,
  OverlayRendererMode,
  OverlayRuntimeCallbacks,
  OverlayRuntimeState,
} from './contracts'

/** When true, use Three.js WebGL pipeline; when false or when WebGL init fails, use 2D drawImage. */
const USE_WEBGL = true

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
  const runtime = createOverlayRuntime(
    { video, webglCanvas, fallbackCanvas, container },
    runtimeCallbacks,
  )

  if (!video || !container) {
    runtime.reportUnavailable()
    return runtime.control
  }

  if (USE_WEBGL && webglCanvas) {
    let switchedTo2d = false
    const callbacks: WebGLOverlayCallbacks = {
      onFatalRuntimeError(error) {
        if (switchedTo2d) return
        switchedTo2d = true
        runtime.install2dFallback(error)
      },
    }
    const control = startWebGLOverlayLoop({
      video,
      canvas: webglCanvas,
      container,
      nodes,
      reactiveOptions: reactiveOptions ?? undefined,
      callbacks,
    })
    if (control) {
      runtime.installWebgl(control, nodes.length > 0)
      return runtime.control
    }
  }

  runtime.install2dFallback()
  return runtime.control
}
