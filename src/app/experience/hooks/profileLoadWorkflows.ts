import type { Dispatch, SetStateAction } from 'react'
import { loadProfile } from '../../../content/experience/loader'
import type { Profile } from '../../../domain/experience/schema'
import {
  type ComposerMode,
  type ComposerSettings,
  type SelectedDimension,
  type SelectedPreset,
} from '../../../domain/experience/composition/types'
import { composeEffectiveProfile, type ComposeReport } from '../composeExperience'
import { logger } from '../../../platform/logger'
import { useAsyncEffect } from './useAsyncEffect'
import {
  createComposedProfileLoadFailure,
  createComposedProfileLoadSuccess,
  createCuratedProfileLoadFailure,
  createCuratedProfileLoadSuccess,
  mergeControlValuesWithDefaults,
  type ControlValues,
  type ProfileLoadResult,
  type ProfileLoadStatus,
} from './profileLoadResults'

export interface ProfileLoadStateSetters {
  setProfile: Dispatch<SetStateAction<Profile | null>>
  setComposeReport: Dispatch<SetStateAction<ComposeReport | null>>
  setControlValues: Dispatch<SetStateAction<ControlValues>>
  setProfileLoadStatus: Dispatch<SetStateAction<ProfileLoadStatus>>
  setProfileLoadError: Dispatch<SetStateAction<string | null>>
}

export interface ProfileLoadRequestOutcome {
  result: ProfileLoadResult
  error: unknown | null
}

export interface ComposedProfileRequest {
  selectedPresets: SelectedPreset[]
  selectedDimensions: SelectedDimension[]
  settings: ComposerSettings
  reducedMotion: boolean
}

export interface CuratedProfileLoadLifecycle {
  conditionId: string
  composerMode: ComposerMode
  reducedMotion: boolean
  retryToken: number
  setIntensity: (value: number) => void
  setters: ProfileLoadStateSetters
}

export interface ComposedProfileLoadLifecycle {
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

export async function requestCuratedProfile(
  conditionId: string,
  reducedMotion: boolean,
): Promise<ProfileLoadRequestOutcome> {
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

export async function requestComposedProfile({
  selectedPresets,
  selectedDimensions,
  settings,
  reducedMotion,
}: ComposedProfileRequest): Promise<ProfileLoadRequestOutcome> {
  try {
    const result = await composeEffectiveProfile(selectedPresets, selectedDimensions, settings)
    return { result: createComposedProfileLoadSuccess(result, reducedMotion), error: null }
  } catch (error) {
    return { result: createComposedProfileLoadFailure(reducedMotion), error }
  }
}

export function applyCuratedProfileLoadResult(
  result: ProfileLoadResult,
  setters: ProfileLoadStateSetters,
  setIntensity: (value: number) => void,
): void {
  setters.setComposeReport(result.composeReport)
  setters.setProfile(result.profile)
  setters.setControlValues(result.controlValues)
  if (result.intensityDefault !== undefined) setIntensity(result.intensityDefault)
  setters.setProfileLoadStatus(result.status)
  setters.setProfileLoadError(result.error)
}

export function applyComposedProfileLoadResult(
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

export function useCuratedProfileLoad({
  conditionId,
  composerMode,
  reducedMotion,
  retryToken,
  setIntensity,
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
      applyCuratedProfileLoadResult(outcome.result, setters, setIntensity)
      if (outcome.error) logger.error('loadProfile failed', outcome.error)
    },
    [conditionId, composerMode, setIntensity, retryToken],
    { onError: (error) => logger.error('loadProfile failed', error) },
  )
}

export function useComposedProfileLoad({
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
