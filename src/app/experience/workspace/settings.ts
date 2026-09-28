import { useCallback, useState } from 'react'
import type {
  ComposerMode,
  SelectedDimension,
  SelectedPreset,
} from '../../../domain/experience/composition/types'
import type { PresetPayload } from '../presets/format'

const DEFAULT_INTENSITY = 0.5
const DEFAULT_CONDITION_ID = 'none'

/**
 * The workspace's tunable settings as one object, so a preset payload applies in a single
 * `apply()` call. Sound-enabled is not a setting: the runtime session is its sole owner
 * (snapshot.soundEnabled / session.setSoundEnabled).
 */
export interface ExperienceSettings {
  composerMode: ComposerMode
  conditionId: string
  presets: SelectedPreset[]
  dimensions: SelectedDimension[]
  intensity: number
  safeMode: boolean
  reducedMotion: boolean
  stressMode: boolean
  couplingStrength: number
  maxFeedback: number
  interactionAmount: number
}

function initialReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function createInitialSettings(): ExperienceSettings {
  return {
    composerMode: 'symptom',
    conditionId: DEFAULT_CONDITION_ID,
    presets: [],
    dimensions: [],
    intensity: DEFAULT_INTENSITY,
    safeMode: true,
    reducedMotion: initialReducedMotion(),
    stressMode: false,
    couplingStrength: 0,
    maxFeedback: 0.35,
    interactionAmount: 0.15,
  }
}

/** A preset payload never carries stressMode (dev-only); the current value is kept. */
export function settingsFromPayload(
  payload: PresetPayload,
  previous: ExperienceSettings,
): ExperienceSettings {
  return {
    ...previous,
    composerMode: payload.mode,
    conditionId: payload.conditionId,
    presets: payload.presets,
    dimensions: payload.dimensions,
    intensity: payload.intensity,
    safeMode: payload.safeMode,
    reducedMotion: payload.reducedMotion,
    couplingStrength: payload.couplingStrength,
    maxFeedback: payload.maxFeedback,
    interactionAmount: payload.interactionAmount,
  }
}

export function settingsToPayload(
  settings: ExperienceSettings,
  audioEnabled: boolean,
): PresetPayload {
  return {
    mode: settings.composerMode,
    conditionId: settings.conditionId,
    presets: settings.presets,
    dimensions: settings.dimensions,
    intensity: settings.intensity,
    safeMode: settings.safeMode,
    reducedMotion: settings.reducedMotion,
    audioEnabled,
    couplingStrength: settings.couplingStrength,
    maxFeedback: settings.maxFeedback,
    interactionAmount: settings.interactionAmount,
  }
}

type SettingsUpdate =
  | Partial<ExperienceSettings>
  | ((previous: ExperienceSettings) => Partial<ExperienceSettings>)
type UpdateSettings = (update: SettingsUpdate) => void

function useField<K extends keyof ExperienceSettings>(
  updateSettings: UpdateSettings,
  key: K,
): (value: ExperienceSettings[K]) => void {
  return useCallback(
    (value: ExperienceSettings[K]) =>
      updateSettings({ [key]: value } as Partial<ExperienceSettings>),
    [updateSettings, key],
  )
}

export interface ExperienceSettingsModel {
  settings: ExperienceSettings
  updateSettings: UpdateSettings
  setComposerMode: (mode: ComposerMode) => void
  setConditionId: (id: string) => void
  setPresets: (presets: SelectedPreset[]) => void
  setDimensions: (dimensions: SelectedDimension[]) => void
  setIntensity: (value: number) => void
  setSafeMode: (value: boolean) => void
  setReducedMotion: (value: boolean) => void
  setStressMode: (value: boolean) => void
  setCouplingStrength: (value: number) => void
  setMaxFeedback: (value: number) => void
  setInteractionAmount: (value: number) => void
  /** Applies a loaded/shared payload in one call (a saved setup or a `#preset=` link). */
  apply: (payload: PresetPayload) => void
  /**
   * The intensity an `apply()` call just set, pinned so the curated-profile load it
   * triggers (mode 'preset') keeps it instead of the profile's own default. `null` once
   * consumed, or when the current condition came from a direct user pick.
   */
  pinnedIntensity: number | null
  consumePinnedIntensity: () => void
}

export function useExperienceSettings(): ExperienceSettingsModel {
  const [settings, setSettings] = useState<ExperienceSettings>(createInitialSettings)
  const [pinnedIntensity, setPinnedIntensity] = useState<number | null>(null)
  const updateSettings = useCallback<UpdateSettings>(
    (update) =>
      setSettings((prev) => ({
        ...prev,
        ...(typeof update === 'function' ? update(prev) : update),
      })),
    [],
  )
  const consumePinnedIntensity = useCallback(() => setPinnedIntensity(null), [])
  const apply = useCallback((payload: PresetPayload) => {
    setSettings((prev) => settingsFromPayload(payload, prev))
    setPinnedIntensity(payload.mode === 'preset' ? payload.intensity : null)
  }, [])
  const setConditionId = useCallback(
    (id: string) => {
      setPinnedIntensity(null)
      updateSettings({ conditionId: id })
    },
    [updateSettings],
  )
  const setComposerMode = useCallback(
    (mode: ComposerMode) => {
      setPinnedIntensity(null)
      updateSettings({ composerMode: mode })
    },
    [updateSettings],
  )

  return {
    settings,
    updateSettings,
    setComposerMode,
    setConditionId,
    setPresets: useField(updateSettings, 'presets'),
    setDimensions: useField(updateSettings, 'dimensions'),
    setIntensity: useField(updateSettings, 'intensity'),
    setSafeMode: useField(updateSettings, 'safeMode'),
    setReducedMotion: useField(updateSettings, 'reducedMotion'),
    setStressMode: useField(updateSettings, 'stressMode'),
    setCouplingStrength: useField(updateSettings, 'couplingStrength'),
    setMaxFeedback: useField(updateSettings, 'maxFeedback'),
    setInteractionAmount: useField(updateSettings, 'interactionAmount'),
    apply,
    pinnedIntensity,
    consumePinnedIntensity,
  }
}
