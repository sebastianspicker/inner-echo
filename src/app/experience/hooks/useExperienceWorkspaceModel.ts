import { useCallback, useEffect, useMemo } from 'react'

import type { EvidenceDocPath } from '../../../content/evidence'
import { describeAppliedClamps } from '../../../domain/experience/safety'
import type { ExperienceSession, SessionSnapshot } from '../../../runtime/session'
import { getCameraIssueMessage } from '../session/cameraMessages'
import { useExperienceSession, useSessionLiveSettings } from '../useExperienceSession'
import { seedPresetStack } from '../workspacePresentation'
import { useCatalog } from './useCatalog'
import { useProfileLoad } from './useProfileLoad'
import { deriveWorkspacePresentation } from './workspacePresentationModel'
import { useWorkspaceRefs } from './workspaceRefs'
import { useWorkspaceState } from './workspaceState'
import type { WorkspaceState } from './workspaceState'

function useCameraController(session: ExperienceSession, snapshot: SessionSnapshot) {
  const { camera, sound, mic } = snapshot
  return useMemo(() => {
    const isRequesting = camera === 'requesting'
    const isActive = camera === 'active'
    const canStop = isRequesting || isActive || sound !== 'off' || mic !== 'off'
    return {
      isRequesting,
      isActive,
      canStop,
      start: session.startCamera,
      stop: session.stopEverything,
    }
  }, [session, camera, sound, mic])
}

function useAudioModel(session: ExperienceSession, snapshot: SessionSnapshot) {
  const { sound, soundEnabled, soundError, masterVolume, mic, micError } = snapshot
  const { inputMode, micSensitivity, micGate } = snapshot
  return useMemo(
    () => ({
      audioStatus: sound,
      audioEnabled: soundEnabled,
      audioError: soundError,
      masterVolume,
      micStatus: mic,
      micError,
      inputMode,
      micSensitivity,
      micGate,
      handleEnableAudio: session.enableSound,
      handleDisableAudio: session.disableSound,
      handleAudioEnabledChange: session.setSoundEnabled,
      handleMasterVolumeChange: session.setMasterVolume,
      handleEnableMic: session.enableMic,
      handleDisableMic: session.disableMic,
      handleInputModeChange: session.setInputMode,
      handleMicSensitivityChange: session.setMicSensitivity,
      handleMicGateChange: session.setMicGate,
    }),
    [
      session,
      sound,
      soundEnabled,
      soundError,
      masterVolume,
      mic,
      micError,
      inputMode,
      micSensitivity,
      micGate,
    ],
  )
}

function useDiagnosticsModel(
  session: ExperienceSession,
  profile: ReturnType<typeof useProfileLoad>['profile'],
  safety: WorkspaceState['safety'],
) {
  const getOverlayDiagnostics = useCallback(() => session.getDiagnostics().overlay, [session])
  const getAudioMetrics = useCallback(() => session.getDiagnostics().audioMetrics, [session])
  const getVideoMetrics = useCallback(() => session.getDiagnostics().videoMetrics, [session])
  const getAudioDebugState = useCallback(() => session.getDiagnostics().audio, [session])
  const getAppliedClamps = useCallback(
    () => describeAppliedClamps(profile, safety.intensity, safety.safeMode, safety.reducedMotion),
    [profile, safety.intensity, safety.safeMode, safety.reducedMotion],
  )
  return {
    getOverlayDiagnostics,
    getAudioMetrics,
    getVideoMetrics,
    getAudioDebugState,
    getAppliedClamps,
  }
}

function useCameraModel(snapshot: SessionSnapshot) {
  return useMemo(
    () => ({
      cameraState: snapshot.camera,
      errorMessage: getCameraIssueMessage(snapshot.cameraIssue),
      overlayState: snapshot.overlay,
    }),
    [snapshot.camera, snapshot.cameraIssue, snapshot.overlay],
  )
}

function useMultimorbidPresetSeeding(state: WorkspaceState): void {
  useEffect(() => {
    if (state.composition.composerMode !== 'multimorbid') return
    state.composition.setSelectedPresets((previous) =>
      seedPresetStack(previous, state.composition.conditionId),
    )
  }, [
    state.composition.composerMode,
    state.composition.conditionId,
    state.composition.setSelectedPresets,
  ])
}

/** An explicit retry reloads the profile and restarts the overlay even for an equivalent profile. */
function useProfileRetry(
  session: ExperienceSession,
  retryProfileLoad: ReturnType<typeof useProfileLoad>['retryProfileLoad'],
) {
  return useCallback(() => {
    retryProfileLoad()
    session.retryOverlay()
  }, [session, retryProfileLoad])
}

function useOpenEvidence(state: WorkspaceState) {
  return useCallback(
    (docPath: EvidenceDocPath) => {
      state.ui.setEvidenceDocPath(docPath)
      state.ui.setEvidenceOpen(true)
    },
    [state.ui.setEvidenceDocPath, state.ui.setEvidenceOpen],
  )
}

export function useExperienceWorkspaceModel() {
  const catalogLoad = useCatalog()
  const state = useWorkspaceState()
  const refs = useWorkspaceRefs()
  const { session, snapshot } = useExperienceSession(refs)
  const profileLoad = useProfileLoad({
    conditionId: state.composition.conditionId,
    composerMode: state.composition.composerMode,
    selectedPresets: state.composition.selectedPresets,
    selectedDimensions: state.composition.selectedDimensions,
    setIntensity: state.safety.setIntensity,
    intensity: state.safety.intensity,
    safeMode: state.safety.safeMode,
    reducedMotion: state.safety.reducedMotion,
    audioEnabled: snapshot.soundEnabled,
    maxFeedback: state.coupling.maxFeedback,
    interactionAmount: state.coupling.interactionAmount,
  })
  useSessionLiveSettings(session, {
    profile: profileLoad.profile,
    reducedMotion: state.safety.reducedMotion,
    safeMode: state.safety.safeMode,
    intensity: state.safety.intensity,
    stressMode: state.safety.stressMode,
    controlValues: profileLoad.controlValues,
    couplingStrength: state.coupling.couplingStrength,
    maxFeedback: state.coupling.maxFeedback,
    diagnosticsActive: import.meta.env.DEV && state.ui.debugOverlay,
  })
  const cameraController = useCameraController(session, snapshot)
  const audio = useAudioModel(session, snapshot)
  const diagnostics = useDiagnosticsModel(session, profileLoad.profile, state.safety)
  const camera = useCameraModel(snapshot)
  const retryProfileLoad = useProfileRetry(session, profileLoad.retryProfileLoad)
  useMultimorbidPresetSeeding(state)
  const openEvidence = useOpenEvidence(state)
  return {
    catalogLoad,
    state,
    camera,
    audio,
    profileLoad: { ...profileLoad, retryProfileLoad },
    refs,
    cameraController,
    diagnostics,
    presentation: deriveWorkspacePresentation(state, profileLoad.profile, camera),
    openEvidence,
  }
}

export type ExperienceWorkspaceModel = ReturnType<typeof useExperienceWorkspaceModel>
