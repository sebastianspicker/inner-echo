import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { overlayConfigurationKey } from './overlayConfiguration'
import type { Profile } from '../../../domain/experience/schema'
import type { CameraState } from '../../../runtime/camera'
import type {
  OverlayControl,
  OverlayRuntimeState,
  VideoMetrics,
} from '../../../runtime/visual/overlay'
import type { AudioEngineControl } from '../../../runtime/audio'
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
  retryToken?: number
  diagnosticsActive?: boolean
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
  retryToken = 0,
  diagnosticsActive = false,
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
  const diagnosticsActiveRef = useRef(diagnosticsActive)
  diagnosticsActiveRef.current = diagnosticsActive
  const configurationKey = useMemo(
    () => overlayConfigurationKey(profile, reducedMotion),
    [profile, reducedMotion],
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: The key covers captured profile definitions and Reduced Motion. Live controls use refs; explicit retry must restart even an equivalent configuration.
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
      diagnosticsActiveRef,
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
  }, [cameraState, configurationKey, retryToken])
}
