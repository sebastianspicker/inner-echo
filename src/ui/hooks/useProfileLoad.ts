import { useState, type Dispatch, type SetStateAction } from 'react'
import { loadProfile } from '../../conditions/loader'
import { getDefaultControlValues } from '../../conditions/controlTargets'
import type { Profile } from '../../conditions/schema'
import { composeEffectiveProfile, type ComposeReport } from '../../composer'
import type { ComposerMode, SelectedDimension, SelectedPreset } from '../../composer'
import { useAsyncEffect } from './useAsyncEffect'

const FALLBACK_PROFILE: Profile = {
  id: 'none',
  label: 'None (Clean)',
  summary: 'No overlay. Baseline camera view.',
  framing: { type: 'baseline' },
  experience_dimensions: [],
  safety: {
    intensity_default: 0,
    intensity_max: 0,
    warnings: [],
    safe_mode_clamps: { max_intensity: 0 },
  },
  ui: { controls: [] },
  video_stack: [],
  audio_stack: { enabled: false },
  reactive: { analyser_to_params: [] },
  references: { dimensions: [] },
}

function mergeControlValuesWithDefaults(
  defaults: Record<string, number | boolean>,
  previous: Record<string, number | boolean>
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
  setAudioEnabled: (v: boolean) => void
  intensity: number
  safeMode: boolean
  reducedMotion: boolean
  audioEnabled: boolean
  maxFeedback: number
  interactionAmount: number
}

export function useProfileLoad(params: UseProfileLoadParams): {
  profile: Profile | null
  composeReport: ComposeReport | null
  controlValues: Record<string, number | boolean>
  setControlValues: Dispatch<SetStateAction<Record<string, number | boolean>>>
  isProfileLoading: boolean
} {
  const {
    conditionId,
    composerMode,
    selectedPresets,
    selectedDimensions,
    setIntensity,
    setAudioEnabled,
    intensity,
    safeMode,
    reducedMotion,
    audioEnabled,
    maxFeedback,
    interactionAmount,
  } = params

  const [profile, setProfile] = useState<Profile | null>(null)
  const [composeReport, setComposeReport] = useState<ComposeReport | null>(null)
  const [controlValues, setControlValues] = useState<Record<string, number | boolean>>({})
  const [isProfileLoading, setProfileLoading] = useState(false)

  useAsyncEffect(
    async (ctx) => {
      if (composerMode !== 'preset' || !conditionId) return
      setProfileLoading(true)
      try {
        const p = await loadProfile(conditionId)
        if (ctx.cancelled) return
        const prof = p ?? FALLBACK_PROFILE
        setProfile(prof)
        setComposeReport(null)
        const defaults = getDefaultControlValues(prof)
        setControlValues(defaults)
        const safe = prof.safety
        if (typeof safe?.intensity_default === 'number') {
          setIntensity(safe.intensity_default)
        }
        setAudioEnabled(false)
      } catch (err) {
        if (!ctx.cancelled) {
          setComposeReport(null)
          setProfile(FALLBACK_PROFILE)
          setControlValues(getDefaultControlValues(FALLBACK_PROFILE))
          setAudioEnabled(false)
          console.error('loadProfile failed', err)
        }
      } finally {
        setProfileLoading(false)
      }
    },
    [conditionId, composerMode, setIntensity, setAudioEnabled],
    { onError: (err) => console.error('loadProfile failed', err) }
  )

  useAsyncEffect(
    async (ctx) => {
      if (composerMode === 'preset') return
      setProfileLoading(true)
      const settings = {
        intensity,
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
        const defaults = getDefaultControlValues(res.profile)
        setControlValues((prev) => mergeControlValuesWithDefaults(defaults, prev))
      } catch (err) {
        if (!ctx.cancelled) console.error('composeEffectiveProfile failed', err)
      } finally {
        setProfileLoading(false)
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
      intensity,
    ],
    { onError: (err) => console.error('composeEffectiveProfile failed', err) }
  )

  return { profile, composeReport, controlValues, setControlValues, isProfileLoading }
}
