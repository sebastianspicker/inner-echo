import { loadProfile } from '../../content/experience/loader'
import { profileSchema } from '../../domain/experience/schema'
import { createComposeFallbackProfile } from '../../domain/experience/fallbackProfile'
import { logger } from '../../platform/logger'
import { getDimensionMappingEntry } from '../../content/experience/dimensionToSignalMapping'
import { getExperienceDimensions } from '../../content/experience/experienceDimensions'
import type {
  ComposerSettings,
  SelectedDimension,
  SelectedPreset,
} from '../../domain/experience/composition/types'
import {
  composeEffectiveProfileCore,
  type ComposeReport,
  type ComposeResult,
  type MissingNodesReport,
} from '../../domain/experience/composition/composeCore'
import { IMPLEMENTED_AUDIO_NODES, IMPLEMENTED_VIDEO_NODES } from '../../runtime/capabilities'

export type { ComposeReport, ComposeResult, MissingNodesReport }

/**
 * Runtime entrypoint (browser/Vite):
 * injects bundled content and runtime capabilities into the pure domain composer.
 */
export async function composeEffectiveProfile(
  presets: SelectedPreset[],
  dimensions: SelectedDimension[],
  settings: ComposerSettings,
): Promise<ComposeResult> {
  const res = await composeEffectiveProfileCore(
    presets,
    dimensions,
    settings,
    {
      loadPresetProfile: loadProfile,
      getDimensionMappingEntry,
      getExperienceDimensions,
    },
    {
      supportedVideoNodeIds: IMPLEMENTED_VIDEO_NODES,
      supportedAudioNodeIds: IMPLEMENTED_AUDIO_NODES,
    },
  )
  const parsed = profileSchema.safeParse(res.profile)
  if (!parsed.success) {
    logger.warn(
      '[composer] Composed profile failed schema validation; falling back to clean profile.',
      parsed.error.flatten(),
    )
    return {
      profile: createComposeFallbackProfile(
        'Internal validation error: composed profile could not be loaded.',
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
