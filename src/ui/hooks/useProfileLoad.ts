import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { loadProfile } from '../../conditions/loader'
import { getDefaultControlValues } from '../../conditions/controlTargets'
import type { Profile } from '../../conditions/schema'
import { BASELINE_PROFILE, createComposeFallbackProfile } from '../../conditions/fallbackProfiles'
import {
  composeEffectiveProfile,
  type ComposeReport,
  type ComposerMode,
  type SelectedDimension,
  type SelectedPreset,
} from '../../composer'
import { useAsyncEffect } from './useAsyncEffect'
import { logger } from '../../utils/logger'

function mergeControlValuesWithDefaults(
  defaults: Record<string, number | boolean>,
  previous: Record<string, number | boolean>,
): Record<string, number | boolean> {
  const next: Record<string, number | boolean> = { ...defaults }
  for (const [key, fallback] of Object.entries(defaults)) {
    const prev = previous[key]
    if (typeof prev === typeof fallback) {
      next[key] = prev
    }
  }
  return next
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
}

export type ProfileLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

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

  useAsyncEffect(
    async (ctx) => {
      if (composerMode !== 'preset') return
      if (!conditionId) {
        setProfileLoadStatus('idle')
        setProfileLoadError(null)
        return
      }
      setProfileLoadStatus('loading')
      setProfileLoadError(null)
      try {
        const p = await loadProfile(conditionId)
        if (ctx.cancelled) return
        if (!p) {
          setComposeReport(null)
          setProfile(BASELINE_PROFILE)
          setControlValues(getDefaultControlValues(BASELINE_PROFILE, { reducedMotion }))
          setProfileLoadStatus('error')
          setProfileLoadError(
            'The selected experience could not be loaded. A clean fallback is active.',
          )
          return
        }
        const prof = p
        setProfile(prof)
        setComposeReport(null)
        const defaults = getDefaultControlValues(prof, { reducedMotion })
        setControlValues(defaults)
        const safe = prof.safety
        if (typeof safe?.intensity_default === 'number') {
          setIntensity(safe.intensity_default)
        }
        setProfileLoadStatus('ready')
      } catch (err) {
        if (!ctx.cancelled) {
          setComposeReport(null)
          setProfile(BASELINE_PROFILE)
          setControlValues(getDefaultControlValues(BASELINE_PROFILE, { reducedMotion }))
          setProfileLoadStatus('error')
          setProfileLoadError(
            'The selected experience could not be loaded. A clean fallback is active.',
          )
          logger.error('loadProfile failed', err)
        }
      }
    },
    [conditionId, composerMode, setIntensity, retryToken],
    { onError: (err) => logger.error('loadProfile failed', err) },
  )

  useEffect(() => {
    if (!profile) return
    setControlValues((prev) => {
      const next = getDefaultControlValues(profile, { reducedMotion })
      for (const key of ['intensity', 'safeMode', 'audioEnabled'] as const) {
        if (typeof prev[key] === typeof next[key]) next[key] = prev[key]
      }
      return next
    })
  }, [profile, reducedMotion])

  useAsyncEffect(
    async (ctx) => {
      if (composerMode === 'preset') return
      setProfileLoadStatus('loading')
      setProfileLoadError(null)
      const settings = {
        intensity: intensityRef.current,
        safeMode,
        reducedMotion,
        audioEnabled,
        micEnabled: false,
        couplingStrength: 0,
        maxFeedback,
        interactionAmount,
        debugOverlay: false,
      }
      try {
        const res = await composeEffectiveProfile(selectedPresets, selectedDimensions, settings)
        if (ctx.cancelled) return
        setProfile(res.profile)
        setComposeReport(res.report)
        const defaults = getDefaultControlValues(res.profile, { reducedMotion })
        setControlValues((prev) => mergeControlValuesWithDefaults(defaults, prev))
        setProfileLoadStatus('ready')
      } catch (err) {
        if (!ctx.cancelled) {
          const fallback = createComposeFallbackProfile(
            'Profile composition failed; showing the clean fallback profile.',
          )
          setProfile(fallback)
          setComposeReport(null)
          setControlValues(getDefaultControlValues(fallback, { reducedMotion }))
          setProfileLoadStatus('error')
          setProfileLoadError('The experience could not be composed. A clean fallback is active.')
          logger.error('composeEffectiveProfile failed', err)
        }
      }
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
    { onError: (err) => logger.error('composeEffectiveProfile failed', err) },
  )

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
