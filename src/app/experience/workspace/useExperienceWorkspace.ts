import { useCallback, useEffect, useMemo, useState } from 'react'

import type { EvidenceDocPath } from '../../../content/evidence'
import { describeAppliedClamps } from '../../../domain/experience/safety'
import type { ExperienceSession, SessionSnapshot } from '../../../runtime/session'
import { getCameraIssueMessage } from '../media/mediaMessages'
import type { PresetPayload } from '../presets/format'
import { useCatalog } from '../profile/useCatalog'
import { useProfileLoad } from '../profile/useProfileLoad'
import { deriveWorkspacePresentation, seedPresetStack } from './presentation'
import { useExperienceSession, useSessionLiveSettings } from './useExperienceSession'
import { useExperienceSettings, type ExperienceSettingsModel } from './settings'
import { useWorkspaceRefs } from './workspaceRefs'

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
  settings: ExperienceSettingsModel['settings'],
) {
  const getOverlayDiagnostics = useCallback(() => session.getDiagnostics().overlay, [session])
  const getAudioMetrics = useCallback(() => session.getDiagnostics().audioMetrics, [session])
  const getVideoMetrics = useCallback(() => session.getDiagnostics().videoMetrics, [session])
  const getAudioDebugState = useCallback(() => session.getDiagnostics().audio, [session])
  const getAppliedClamps = useCallback(
    () =>
      describeAppliedClamps(profile, settings.intensity, settings.safeMode, settings.reducedMotion),
    [profile, settings.intensity, settings.safeMode, settings.reducedMotion],
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

function useMultimorbidPresetSeeding(settingsModel: ExperienceSettingsModel): void {
  const { composerMode, conditionId } = settingsModel.settings
  useEffect(() => {
    if (composerMode !== 'multimorbid') return
    settingsModel.updateSettings((previous) => ({
      presets: seedPresetStack(previous.presets, conditionId),
    }))
  }, [composerMode, conditionId, settingsModel])
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

function useWorkspaceUiState() {
  const [debugOverlay, setDebugOverlay] = useState(false)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [evidenceDocPath, setEvidenceDocPath] = useState<EvidenceDocPath>(
    'docs/references/README.md',
  )
  return {
    debugOverlay,
    setDebugOverlay,
    evidenceOpen,
    setEvidenceOpen,
    evidenceDocPath,
    setEvidenceDocPath,
  }
}

type WorkspaceUiState = ReturnType<typeof useWorkspaceUiState>

function useOpenEvidence(ui: WorkspaceUiState) {
  return useCallback(
    (docPath: EvidenceDocPath) => {
      ui.setEvidenceDocPath(docPath)
      ui.setEvidenceOpen(true)
    },
    [ui],
  )
}

/** Applies a loaded/shared payload in one call: settings.apply(...) + forcing sound off (ADR-0001). */
function useApplyPreset(settingsModel: ExperienceSettingsModel, session: ExperienceSession) {
  return useCallback(
    (payload: PresetPayload) => {
      settingsModel.apply(payload)
      session.setSoundEnabled(false)
    },
    [settingsModel, session],
  )
}

function buildProfileLoadParams(
  settingsModel: ExperienceSettingsModel,
  audioEnabled: boolean,
): Parameters<typeof useProfileLoad>[0] {
  const { settings } = settingsModel
  return {
    conditionId: settings.conditionId,
    composerMode: settings.composerMode,
    selectedPresets: settings.presets,
    selectedDimensions: settings.dimensions,
    setIntensity: settingsModel.setIntensity,
    intensity: settings.intensity,
    safeMode: settings.safeMode,
    reducedMotion: settings.reducedMotion,
    audioEnabled,
    maxFeedback: settings.maxFeedback,
    interactionAmount: settings.interactionAmount,
    intensityOverride: settingsModel.pinnedIntensity,
    consumeIntensityOverride: settingsModel.consumePinnedIntensity,
  }
}

function settingsSetters(settingsModel: ExperienceSettingsModel) {
  return {
    setComposerMode: settingsModel.setComposerMode,
    setConditionId: settingsModel.setConditionId,
    setPresets: settingsModel.setPresets,
    setDimensions: settingsModel.setDimensions,
    setIntensity: settingsModel.setIntensity,
    setSafeMode: settingsModel.setSafeMode,
    setReducedMotion: settingsModel.setReducedMotion,
    setStressMode: settingsModel.setStressMode,
    setCouplingStrength: settingsModel.setCouplingStrength,
    setMaxFeedback: settingsModel.setMaxFeedback,
    setInteractionAmount: settingsModel.setInteractionAmount,
  }
}

export function useExperienceWorkspace() {
  const catalogLoad = useCatalog()
  const settingsModel = useExperienceSettings()
  const { settings } = settingsModel
  const ui = useWorkspaceUiState()
  const refs = useWorkspaceRefs()
  const { session, snapshot } = useExperienceSession(refs)
  const profileLoad = useProfileLoad(buildProfileLoadParams(settingsModel, snapshot.soundEnabled))
  useSessionLiveSettings(session, {
    profile: profileLoad.profile,
    reducedMotion: settings.reducedMotion,
    safeMode: settings.safeMode,
    intensity: settings.intensity,
    stressMode: settings.stressMode,
    controlValues: profileLoad.controlValues,
    couplingStrength: settings.couplingStrength,
    maxFeedback: settings.maxFeedback,
    diagnosticsActive: import.meta.env.DEV && ui.debugOverlay,
  })
  const cameraController = useCameraController(session, snapshot)
  const audio = useAudioModel(session, snapshot)
  const diagnostics = useDiagnosticsModel(session, profileLoad.profile, settings)
  const camera = useCameraModel(snapshot)
  const retryProfileLoad = useProfileRetry(session, profileLoad.retryProfileLoad)
  useMultimorbidPresetSeeding(settingsModel)
  const openEvidence = useOpenEvidence(ui)
  const onApplyPreset = useApplyPreset(settingsModel, session)

  return {
    catalogLoad,
    settings,
    ...settingsSetters(settingsModel),
    onApplyPreset,
    ui,
    camera,
    audio,
    profileLoad: { ...profileLoad, retryProfileLoad },
    refs,
    cameraController,
    diagnostics,
    presentation: deriveWorkspacePresentation(settings, profileLoad.profile, camera),
    openEvidence,
  }
}

export type ExperienceWorkspaceModel = ReturnType<typeof useExperienceWorkspace>
