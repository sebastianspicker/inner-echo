import { loadProfile } from '../conditions/loader'
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
  return composeEffectiveProfileCore(presets, dimensions, settings, {
    loadPresetProfile: loadProfile,
    getDimensionMappingEntry,
    getExperienceDimensions,
  })
}

