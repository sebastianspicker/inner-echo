import { loadProfile } from '../conditions/loader'
import { profileSchema, type Profile } from '../conditions/schema'
import { getDimensionMappingEntry } from './dimensionToSignalMapping'
import { getExperienceDimensions } from './experienceDimensions'
import type { ComposerSettings, SelectedDimension, SelectedPreset } from './types'
import {
  composeEffectiveProfileCore,
  type ComposeReport,
  type ComposeResult,
  type MissingNodesReport,
} from './composeCore'

export type { ComposeReport, ComposeResult, MissingNodesReport }

function makeFallbackComposedProfile(): Profile {
  return {
    id: 'composed_fallback',
    label: 'Composed Overlay (Fallback)',
    summary: 'Fallback profile used due to an internal validation error. No overlay is applied.',
    framing: { type: 'baseline', disclaimer: 'Fallback: composition failed validation; showing clean camera view.' },
    experience_dimensions: [],
    safety: {
      intensity_default: 0,
      intensity_max: 0,
      warnings: ['Internal validation error: composed profile could not be loaded.'],
      safe_mode_clamps: { max_intensity: 0 },
    },
    video_stack: [],
    audio_stack: { enabled: false },
    reactive: { analyser_to_params: [] },
    ui: { controls: [] },
    references: { dimensions: [] },
  }
}

/**
 * Runtime entrypoint (browser/Vite):
 * uses condition loader + JSON adapters to provide sources to the pure core composer.
 */
export async function composeEffectiveProfile(
  presets: SelectedPreset[],
  dimensions: SelectedDimension[],
  settings: ComposerSettings
): Promise<ComposeResult> {
  const res = await composeEffectiveProfileCore(presets, dimensions, settings, {
    loadPresetProfile: loadProfile,
    getDimensionMappingEntry,
    getExperienceDimensions,
  })
  const parsed = profileSchema.safeParse(res.profile)
  if (!parsed.success) {
    console.warn('[composer] Composed profile failed schema validation; falling back to clean profile.', parsed.error.flatten())
    return {
      profile: makeFallbackComposedProfile(),
      report: {
        ...res.report,
        warnings: [
          ...(res.report.warnings ?? []),
          'Internal error: composed profile failed schema validation; falling back to clean profile.',
        ],
      },
    }
  }
  return { profile: parsed.data, report: res.report }
}

