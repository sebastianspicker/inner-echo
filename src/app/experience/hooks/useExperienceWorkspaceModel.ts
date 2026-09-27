import { useCallback, useEffect, useRef } from 'react'

import type { EvidenceDocPath } from '../../../content/evidence'
import type { Profile } from '../../../domain/experience/schema'
import { useAudioRuntime } from '../session/useAudioRuntime'
import { seedPresetStack } from '../workspacePresentation'
import { useCameraSession } from './useCameraSession'
import { useCatalog } from './useCatalog'
import { useProfileLoad } from './useProfileLoad'
import { useWorkspaceRuntime } from './useWorkspaceRuntime'
import { deriveWorkspacePresentation } from './workspacePresentationModel'
import { useWorkspaceRefs } from './workspaceRefs'
import { useWorkspaceState } from './workspaceState'

export function useExperienceWorkspaceModel() {
  const catalogLoad = useCatalog()
  const state = useWorkspaceState()
  const profileRef = useRef<Profile | null>(null)
  const audio = useAudioRuntime({ profileRef })
  const profileLoad = useProfileLoad({
    conditionId: state.composition.conditionId,
    composerMode: state.composition.composerMode,
    selectedPresets: state.composition.selectedPresets,
    selectedDimensions: state.composition.selectedDimensions,
    setIntensity: state.safety.setIntensity,
    intensity: state.safety.intensity,
    safeMode: state.safety.safeMode,
    reducedMotion: state.safety.reducedMotion,
    audioEnabled: audio.audioEnabled,
    maxFeedback: state.coupling.maxFeedback,
    interactionAmount: state.coupling.interactionAmount,
  })
  const refs = useWorkspaceRefs(state, profileRef, profileLoad.profile, profileLoad.controlValues)
  const cameraController = useCameraSession(state, refs, audio)
  const diagnostics = useWorkspaceRuntime(state, refs, audio, profileLoad)
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
  const openEvidence = useCallback(
    (docPath: EvidenceDocPath) => {
      state.ui.setEvidenceDocPath(docPath)
      state.ui.setEvidenceOpen(true)
    },
    [state.ui.setEvidenceDocPath, state.ui.setEvidenceOpen],
  )
  return {
    catalogLoad,
    state,
    audio,
    profileLoad,
    refs,
    cameraController,
    diagnostics,
    presentation: deriveWorkspacePresentation(state, profileLoad.profile),
    openEvidence,
  }
}

export type ExperienceWorkspaceModel = ReturnType<typeof useExperienceWorkspaceModel>
