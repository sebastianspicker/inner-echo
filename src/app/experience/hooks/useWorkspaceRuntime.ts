import { useEffect } from 'react'

import { clampIntensity, getSafetyContext } from '../../../domain/experience/safety'
import { startRmsMeter, syncConditionAudio } from '../session/cameraRuntime'
import type { useAudioRuntime } from '../session/useAudioRuntime'
import { useOverlayController } from '../session/useOverlayController'
import { useReactivePipeline } from '../session/useReactivePipeline'
import type { useProfileLoad } from './useProfileLoad'
import type { WorkspaceRefs } from './workspaceRefs'
import type { WorkspaceState } from './workspaceState'

function useOverlayParameterSync(
  state: WorkspaceState,
  refs: WorkspaceRefs,
  profileLoad: ReturnType<typeof useProfileLoad>,
) {
  const { intensity, safeMode, stressMode } = state.safety
  const { controlValues, profile } = profileLoad
  useEffect(() => {
    if (!profile) return
    const clampedIntensity = clampIntensity(profile, intensity, safeMode)
    refs.overlayControlRef.current?.setParams({
      intensity: clampedIntensity,
      safeMode,
      controlValues: { ...controlValues, intensity: clampedIntensity, safeMode },
      stressMode,
      safetyContext: getSafetyContext(profile),
    })
  }, [controlValues, intensity, refs.overlayControlRef, profile, safeMode, stressMode])
}

function useAudioSynchronization(
  state: WorkspaceState,
  refs: WorkspaceRefs,
  audio: ReturnType<typeof useAudioRuntime>,
  profileLoad: ReturnType<typeof useProfileLoad>,
) {
  useEffect(
    () =>
      syncConditionAudio(
        audio.audioEngineControlRef.current,
        audio.audioStatus,
        audio.audioEnabled,
        profileLoad.profile,
        audio.setMasterVolume,
      ),
    [
      audio.audioEnabled,
      audio.audioEngineControlRef,
      audio.audioStatus,
      audio.setMasterVolume,
      profileLoad.profile,
    ],
  )
  useEffect(
    () =>
      startRmsMeter(
        import.meta.env.DEV && audio.audioStatus === 'on' && state.ui.debugOverlay,
        audio.audioEngineControlRef,
        refs.rmsDebugRef,
      ),
    [audio.audioEngineControlRef, audio.audioStatus, refs.rmsDebugRef, state.ui.debugOverlay],
  )
}

export function useWorkspaceRuntime(
  state: WorkspaceState,
  refs: WorkspaceRefs,
  audio: ReturnType<typeof useAudioRuntime>,
  profileLoad: ReturnType<typeof useProfileLoad>,
) {
  const diagnostics = useOverlayController({
    overlayControlRef: refs.overlayControlRef,
    audioControlRef: audio.audioEngineControlRef,
    profile: profileLoad.profile,
    reducedMotion: state.safety.reducedMotion,
    safeMode: state.safety.safeMode,
    intensity: state.safety.intensity,
  })
  useReactivePipeline({
    retryToken: profileLoad.retryToken,
    cameraState: state.camera.cameraState,
    reducedMotion: state.safety.reducedMotion,
    profile: profileLoad.profile,
    diagnosticsActive: import.meta.env.DEV && state.ui.debugOverlay,
    videoRef: refs.videoRef,
    canvasRef: refs.canvasRef,
    fallbackCanvasRef: refs.fallbackCanvasRef,
    containerRef: refs.containerRef,
    overlayControlRef: refs.overlayControlRef,
    audioEngineControlRef: audio.audioEngineControlRef,
    videoMetricsRef: refs.videoMetricsRef,
    couplingStrengthRef: refs.couplingStrengthRef,
    maxFeedbackRef: refs.maxFeedbackRef,
    safeModeRef: refs.safeModeRef,
    intensityRef: refs.intensityRef,
    controlValuesRef: refs.controlValuesRef,
    stressModeRef: refs.stressModeRef,
    onOverlayStateChange: state.camera.setOverlayState,
  })
  useOverlayParameterSync(state, refs, profileLoad)
  useAudioSynchronization(state, refs, audio, profileLoad)
  return diagnostics
}
