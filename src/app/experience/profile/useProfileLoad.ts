import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { loadProfile } from '../../../content/experience/loader'
import type { Profile } from '../../../domain/experience/schema'
import type {
  ComposerMode,
  ComposerSettings,
  SelectedDimension,
  SelectedPreset,
} from '../../../domain/experience/composition/types'
import { logger } from '../../../platform/logger'
import { composeEffectiveProfile, type ComposeReport } from './composeExperience'
import { mergeControlValuesWithDefaults, mergePersistedControlValues } from './controls'
import { useAsyncEffect } from './useAsyncEffect'
import {
  createComposedProfileLoadFailure,
  createComposedProfileLoadSuccess,
  createCuratedProfileLoadFailure,
  createCuratedProfileLoadSuccess,
  type ControlValues,
  type ProfileLoadResult,
  type ProfileLoadStatus,
} from './profileLoadResults'

export type { ProfileLoadStatus } from './profileLoadResults'

interface ProfileLoadStateSetters {
  setProfile: Dispatch<SetStateAction<Profile | null>>
  setComposeReport: Dispatch<SetStateAction<ComposeReport | null>>
  setControlValues: Dispatch<SetStateAction<ControlValues>>
  setProfileLoadStatus: Dispatch<SetStateAction<ProfileLoadStatus>>
  setProfileLoadError: Dispatch<SetStateAction<string | null>>
}

async function requestCuratedProfile(
  conditionId: string,
  reducedMotion: boolean,
): Promise<{ result: ProfileLoadResult; error: unknown | null }> {
  try {
    const profile = await loadProfile(conditionId)
    return {
      result: profile
        ? createCuratedProfileLoadSuccess(profile, reducedMotion)
        : createCuratedProfileLoadFailure(reducedMotion),
      error: null,
    }
  } catch (error) {
    return { result: createCuratedProfileLoadFailure(reducedMotion), error }
  }
}

async function requestComposedProfile(request: {
  selectedPresets: SelectedPreset[]
  selectedDimensions: SelectedDimension[]
  settings: ComposerSettings
  reducedMotion: boolean
}): Promise<{ result: ProfileLoadResult; error: unknown | null }> {
  try {
    const result = await composeEffectiveProfile(
      request.selectedPresets,
      request.selectedDimensions,
      request.settings,
    )
    return {
      result: createComposedProfileLoadSuccess(result, request.reducedMotion),
      error: null,
    }
  } catch (error) {
    return { result: createComposedProfileLoadFailure(request.reducedMotion), error }
  }
}

/**
 * Applies a curated-profile load result. `intensityOverride` keeps a preset payload's own
 * intensity across the load it triggered (a link/library Load already set intensity via
 * settings.apply); a user-initiated condition change passes `null` and gets the profile's
 * own default, as before.
 */
function applyCuratedProfileLoadResult(
  result: ProfileLoadResult,
  setters: ProfileLoadStateSetters,
  setIntensity: (value: number) => void,
  intensityOverride: number | null,
): void {
  setters.setComposeReport(result.composeReport)
  setters.setProfile(result.profile)
  setters.setControlValues(result.controlValues)
  if (intensityOverride !== null) setIntensity(intensityOverride)
  else if (result.intensityDefault !== undefined) setIntensity(result.intensityDefault)
  setters.setProfileLoadStatus(result.status)
  setters.setProfileLoadError(result.error)
}

function applyComposedProfileLoadResult(
  result: ProfileLoadResult,
  setters: ProfileLoadStateSetters,
): void {
  setters.setProfile(result.profile)
  setters.setComposeReport(result.composeReport)
  setters.setControlValues((previous) =>
    result.status === 'ready'
      ? mergeControlValuesWithDefaults(result.controlValues, previous)
      : result.controlValues,
  )
  setters.setProfileLoadStatus(result.status)
  setters.setProfileLoadError(result.error)
}

interface CuratedProfileLoadLifecycle {
  conditionId: string
  composerMode: ComposerMode
  reducedMotion: boolean
  retryToken: number
  setIntensity: (value: number) => void
  intensityOverrideRef: { current: number | null }
  consumeIntensityOverride: () => void
  setters: ProfileLoadStateSetters
}

function useCuratedProfileLoad({
  conditionId,
  composerMode,
  reducedMotion,
  retryToken,
  setIntensity,
  intensityOverrideRef,
  consumeIntensityOverride,
  setters,
}: CuratedProfileLoadLifecycle): void {
  useAsyncEffect(
    async (ctx) => {
      if (composerMode !== 'preset') return
      if (!conditionId) {
        setters.setProfileLoadStatus('idle')
        setters.setProfileLoadError(null)
        return
      }
      setters.setProfileLoadStatus('loading')
      setters.setProfileLoadError(null)
      const outcome = await requestCuratedProfile(conditionId, reducedMotion)
      if (ctx.cancelled) return
      const intensityOverride = intensityOverrideRef.current
      applyCuratedProfileLoadResult(outcome.result, setters, setIntensity, intensityOverride)
      if (intensityOverride !== null) consumeIntensityOverride()
      if (outcome.error) logger.error('loadProfile failed', outcome.error)
    },
    [conditionId, composerMode, setIntensity, retryToken],
    { onError: (error) => logger.error('loadProfile failed', error) },
  )
}

interface ComposedProfileLoadLifecycle {
  composerMode: ComposerMode
  selectedPresets: SelectedPreset[]
  selectedDimensions: SelectedDimension[]
  intensity: number
  safeMode: boolean
  reducedMotion: boolean
  audioEnabled: boolean
  maxFeedback: number
  interactionAmount: number
  retryToken: number
  setters: ProfileLoadStateSetters
}

function useComposedProfileLoad({
  composerMode,
  selectedPresets,
  selectedDimensions,
  intensity,
  safeMode,
  reducedMotion,
  audioEnabled,
  maxFeedback,
  interactionAmount,
  retryToken,
  setters,
}: ComposedProfileLoadLifecycle): void {
  useAsyncEffect(
    async (ctx) => {
      if (composerMode === 'preset') return
      setters.setProfileLoadStatus('loading')
      setters.setProfileLoadError(null)
      const outcome = await requestComposedProfile({
        selectedPresets,
        selectedDimensions,
        settings: {
          intensity,
          safeMode,
          reducedMotion,
          audioEnabled,
          micEnabled: false,
          couplingStrength: 0,
          maxFeedback,
          interactionAmount,
          debugOverlay: false,
        },
        reducedMotion,
      })
      if (ctx.cancelled) return
      applyComposedProfileLoadResult(outcome.result, setters)
      if (outcome.error) logger.error('composeEffectiveProfile failed', outcome.error)
    },
    [
      composerMode,
      selectedPresets,
      selectedDimensions,
      safeMode,
      reducedMotion,
      audioEnabled,
      maxFeedback,
      interactionAmount,
      retryToken,
    ],
    { onError: (error) => logger.error('composeEffectiveProfile failed', error) },
  )
}

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
  /** A preset payload's own intensity, pinned across the curated load it triggers; see settings.ts. */
  intensityOverride: number | null
  consumeIntensityOverride: () => void
}

function useProfileLoadState() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [composeReport, setComposeReport] = useState<ComposeReport | null>(null)
  const [controlValues, setControlValues] = useState<Record<string, number | boolean>>({})
  const [profileLoadStatus, setProfileLoadStatus] = useState<ProfileLoadStatus>('idle')
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const retryProfileLoad = useCallback(() => setRetryToken((value) => value + 1), [])
  const setters: ProfileLoadStateSetters = {
    setProfile,
    setComposeReport,
    setControlValues,
    setProfileLoadStatus,
    setProfileLoadError,
  }
  return {
    profile,
    composeReport,
    controlValues,
    setControlValues,
    profileLoadStatus,
    profileLoadError,
    retryToken,
    retryProfileLoad,
    isProfileLoading: profileLoadStatus === 'loading',
    setters,
  }
}

export function useProfileLoad(params: UseProfileLoadParams): {
  profile: Profile | null
  composeReport: ComposeReport | null
  controlValues: Record<string, number | boolean>
  setControlValues: Dispatch<SetStateAction<Record<string, number | boolean>>>
  isProfileLoading: boolean
  profileLoadStatus: ProfileLoadStatus
  profileLoadError: string | null
  retryProfileLoad(): void
  retryToken: number
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
    intensityOverride,
    consumeIntensityOverride,
  } = params

  // Use refs for values the composition/curated-load effects should read without retriggering.
  const intensityRef = useRef(intensity)
  intensityRef.current = intensity
  const intensityOverrideRef = useRef(intensityOverride)
  intensityOverrideRef.current = intensityOverride

  const load = useProfileLoadState()
  const { profile, setControlValues } = load

  useCuratedProfileLoad({
    conditionId,
    composerMode,
    reducedMotion,
    retryToken: load.retryToken,
    setIntensity,
    intensityOverrideRef,
    consumeIntensityOverride,
    setters: load.setters,
  })

  useEffect(() => {
    if (!profile) return
    setControlValues((prev) => mergePersistedControlValues(profile, reducedMotion, prev))
  }, [profile, reducedMotion, setControlValues])

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
    retryToken: load.retryToken,
    setters: load.setters,
  })

  return {
    profile: load.profile,
    composeReport: load.composeReport,
    controlValues: load.controlValues,
    setControlValues: load.setControlValues,
    isProfileLoading: load.isProfileLoading,
    profileLoadStatus: load.profileLoadStatus,
    profileLoadError: load.profileLoadError,
    retryProfileLoad: load.retryProfileLoad,
    retryToken: load.retryToken,
  }
}
