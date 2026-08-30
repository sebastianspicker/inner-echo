import { getDefaultControlValues } from '../controls/controlTargets'
import {
  BASELINE_PROFILE,
  createComposeFallbackProfile,
} from '../../../domain/experience/fallbackProfile'
import type { Profile } from '../../../domain/experience/schema'
import type {
  ComposeReport,
  ComposeResult,
} from '../../../domain/experience/composition/composeCore'

export type ControlValues = Record<string, number | boolean>
export type ProfileLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface ProfileLoadResult {
  profile: Profile
  composeReport: ComposeReport | null
  controlValues: ControlValues
  status: Exclude<ProfileLoadStatus, 'idle' | 'loading'>
  error: string | null
  intensityDefault: number | undefined
}

const CURATED_PROFILE_LOAD_ERROR =
  'The selected experience could not be loaded. A clean fallback is active.'
const COMPOSED_PROFILE_LOAD_ERROR =
  'The experience could not be composed. A clean fallback is active.'

export function mergeControlValuesWithDefaults(
  defaults: ControlValues,
  previous: ControlValues,
): ControlValues {
  const next: ControlValues = { ...defaults }
  for (const [key, fallback] of Object.entries(defaults)) {
    const previousValue = previous[key]
    if (typeof previousValue === typeof fallback) next[key] = previousValue
  }
  return next
}

export function mergePersistedControlValues(
  profile: Profile,
  reducedMotion: boolean,
  previous: ControlValues,
): ControlValues {
  const defaults = getDefaultControlValues(profile, { reducedMotion })
  for (const key of ['intensity', 'safeMode', 'audioEnabled'] as const) {
    if (typeof previous[key] === typeof defaults[key]) defaults[key] = previous[key]
  }
  return defaults
}

export function createCuratedProfileLoadSuccess(
  profile: Profile,
  reducedMotion: boolean,
): ProfileLoadResult {
  return {
    profile,
    composeReport: null,
    controlValues: getDefaultControlValues(profile, { reducedMotion }),
    status: 'ready',
    error: null,
    intensityDefault:
      typeof profile.safety?.intensity_default === 'number'
        ? profile.safety.intensity_default
        : undefined,
  }
}

export function createCuratedProfileLoadFailure(reducedMotion: boolean): ProfileLoadResult {
  return {
    profile: BASELINE_PROFILE,
    composeReport: null,
    controlValues: getDefaultControlValues(BASELINE_PROFILE, { reducedMotion }),
    status: 'error',
    error: CURATED_PROFILE_LOAD_ERROR,
    intensityDefault: undefined,
  }
}

export function createComposedProfileLoadSuccess(
  result: ComposeResult,
  reducedMotion: boolean,
): ProfileLoadResult {
  return {
    profile: result.profile,
    composeReport: result.report,
    controlValues: getDefaultControlValues(result.profile, { reducedMotion }),
    status: 'ready',
    error: null,
    intensityDefault: undefined,
  }
}

export function createComposedProfileLoadFailure(reducedMotion: boolean): ProfileLoadResult {
  const profile = createComposeFallbackProfile(
    'Profile composition failed; showing the clean fallback profile.',
  )
  return {
    profile,
    composeReport: null,
    controlValues: getDefaultControlValues(profile, { reducedMotion }),
    status: 'error',
    error: COMPOSED_PROFILE_LOAD_ERROR,
    intensityDefault: undefined,
  }
}
