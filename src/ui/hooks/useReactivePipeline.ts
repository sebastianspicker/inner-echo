import { useEffect, type MutableRefObject } from 'react'
import type { Profile } from '../../conditions/schema'
import type { CameraState } from '../../engine/video'
import type { OverlayControl, OverlayRuntimeState, VideoMetrics } from '../../engine/canvas'
import type { AudioEngineControl } from '../../engine/audio'
import {
  createReactiveOverlayLifecycle,
  getReactiveOverlayElements,
  reportUnavailable,
  stopReactiveOverlay,
  type ReactivePipelineRefs,
} from './reactivePipelineRuntime'

export interface UseReactivePipelineParams {
  cameraState: CameraState
  reducedMotion: boolean
  profile: Profile | null
  videoRef: MutableRefObject<HTMLVideoElement | null>
  canvasRef: MutableRefObject<HTMLCanvasElement | null>
  fallbackCanvasRef: MutableRefObject<HTMLCanvasElement | null>
  containerRef: MutableRefObject<HTMLDivElement | null>
  overlayControlRef: MutableRefObject<OverlayControl | null>
  audioEngineControlRef: MutableRefObject<AudioEngineControl | null>
  videoMetricsRef: MutableRefObject<VideoMetrics | null>
  couplingStrengthRef: MutableRefObject<number>
  maxFeedbackRef: MutableRefObject<number>
  safeModeRef: MutableRefObject<boolean>
  intensityRef: MutableRefObject<number>
  controlValuesRef: MutableRefObject<Record<string, number | boolean>>
  stressModeRef: MutableRefObject<boolean>
  onOverlayStateChange?: (state: OverlayRuntimeState) => void
}

/**
 * Manages the WebGL overlay pipeline lifecycle.
 *
 * Starts the overlay loop when the camera becomes active, creates the coupling engine
 * and reactive driver per profile, and tears everything down on cleanup.
 */
export function useReactivePipeline({
  cameraState,
  reducedMotion,
  profile,
  videoRef,
  canvasRef,
  fallbackCanvasRef,
  containerRef,
  overlayControlRef,
  audioEngineControlRef,
  videoMetricsRef,
  couplingStrengthRef,
  maxFeedbackRef,
  safeModeRef,
  intensityRef,
  controlValuesRef,
  stressModeRef,
  onOverlayStateChange,
}: UseReactivePipelineParams): void {
  // biome-ignore lint/correctness/useExhaustiveDependencies: Refs are used as mutable containers read each animation frame. Adding them as deps would re-create the WebGL pipeline on every slider change.
  useEffect(() => {
    if (cameraState !== 'active') {
      stopReactiveOverlay(overlayControlRef)
      reportUnavailable(onOverlayStateChange)
      return
    }

    const elements = getReactiveOverlayElements(
      videoRef.current,
      canvasRef.current,
      fallbackCanvasRef.current,
      containerRef.current,
    )
    if (!elements || !profile) {
      reportUnavailable(onOverlayStateChange)
      return
    }

    const reactiveRefs: ReactivePipelineRefs = {
      audioEngineControlRef,
      videoMetricsRef,
      couplingStrengthRef,
      maxFeedbackRef,
      safeModeRef,
    }
    const lifecycle = createReactiveOverlayLifecycle({
      ...elements,
      profile,
      reducedMotion,
      overlayControlRef,
      reactiveRefs,
      safeModeRef,
      intensityRef,
      controlValuesRef,
      stressModeRef,
      onOverlayStateChange,
    })
    lifecycle.start()
    return lifecycle.dispose
  }, [cameraState, reducedMotion, profile])
}
