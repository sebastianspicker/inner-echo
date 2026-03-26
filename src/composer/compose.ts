import { loadProfile } from '../conditions/loader'
import { profileSchema } from '../conditions/schema'
import { createComposeFallbackProfile } from '../conditions/fallbackProfiles'
import { logger } from '../utils/logger'
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
    logger.warn(
      '[composer] Composed profile failed schema validation; falling back to clean profile.',
      parsed.error.flatten()
    )
    return {
      profile: createComposeFallbackProfile(
        'Internal validation error: composed profile could not be loaded.'
      ),
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
