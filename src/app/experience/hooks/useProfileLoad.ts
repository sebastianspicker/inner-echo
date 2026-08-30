import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { Profile } from '../../../domain/experience/schema'
import {
  type ComposerMode,
  type SelectedDimension,
  type SelectedPreset,
} from '../../../domain/experience/composition/types'
import type { ComposeReport } from '../composeExperience'
import {
  useComposedProfileLoad,
  useCuratedProfileLoad,
  type ProfileLoadStateSetters,
} from './profileLoadWorkflows'
import { mergePersistedControlValues, type ProfileLoadStatus } from './profileLoadResults'

export interface UseProfileLoadParams {
  conditionId: string
  composerMode: ComposerMode
  selectedPresets: SelectedPreset[]
  selectedDimensions: SelectedDimension[]
  setIntensity: (v: number) => void
  intensity: number
  safeMode: boolean
  reducedMotion: boolean
  audioEnabled: boolean
  maxFeedback: number
  interactionAmount: number
}

export type { ProfileLoadStatus } from './profileLoadResults'

export function useProfileLoad(params: UseProfileLoadParams): {
  profile: Profile | null
  composeReport: ComposeReport | null
  controlValues: Record<string, number | boolean>
  setControlValues: Dispatch<SetStateAction<Record<string, number | boolean>>>
  isProfileLoading: boolean
  profileLoadStatus: ProfileLoadStatus
  profileLoadError: string | null
  retryProfileLoad(): void
} {
  const {
    conditionId,
    composerMode,
    selectedPresets,
    selectedDimensions,
    setIntensity,
    intensity,
    safeMode,
    reducedMotion,
    audioEnabled,
    maxFeedback,
    interactionAmount,
  } = params

  // Use a ref for intensity so the composition effect doesn't re-trigger on every slider move.
  const intensityRef = useRef(intensity)
  intensityRef.current = intensity

  const [profile, setProfile] = useState<Profile | null>(null)
  const [composeReport, setComposeReport] = useState<ComposeReport | null>(null)
  const [controlValues, setControlValues] = useState<Record<string, number | boolean>>({})
  const [profileLoadStatus, setProfileLoadStatus] = useState<ProfileLoadStatus>('idle')
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const retryProfileLoad = useCallback(() => setRetryToken((value) => value + 1), [])
  const isProfileLoading = profileLoadStatus === 'loading'
  const stateSetters: ProfileLoadStateSetters = {
    setProfile,
    setComposeReport,
    setControlValues,
    setProfileLoadStatus,
    setProfileLoadError,
  }

  useCuratedProfileLoad({
    conditionId,
    composerMode,
    reducedMotion,
    retryToken,
    setIntensity,
    setters: stateSetters,
  })

  useEffect(() => {
    if (!profile) return
    setControlValues((prev) => {
      return mergePersistedControlValues(profile, reducedMotion, prev)
    })
  }, [profile, reducedMotion])

  useComposedProfileLoad({
    composerMode,
    selectedPresets,
    selectedDimensions,
    intensity: intensityRef.current,
    safeMode,
    reducedMotion,
    audioEnabled,
    maxFeedback,
    interactionAmount,
    retryToken,
    setters: stateSetters,
  })

  return {
    profile,
    composeReport,
    controlValues,
    setControlValues,
    isProfileLoading,
    profileLoadStatus,
    profileLoadError,
    retryProfileLoad,
  }
}
