/**
 * Read-only adapter for `src/conditions/dimension-to-signal-mapping.json`.
 *
 * IMPORTANT:
 * - `src/conditions/**` JSON is treated as an API contract (read-only).
 */

import dimensionToSignalMappingFile from '../conditions/dimension-to-signal-mapping.json'
import { dimensionToSignalMappingFileSchema } from '../conditions/schema'
import { logger } from '../utils/logger'
import type { MotifDef, DimensionSignalMappingEntry } from './types'

export type { MotifDef, DimensionSignalMappingEntry }

{
  const result = dimensionToSignalMappingFileSchema.safeParse(dimensionToSignalMappingFile)
  if (!result.success) {
    logger.warn('[dimensionToSignalMapping] Schema validation issues:', result.error.issues)
  }
}

export function getDimensionMappingEntry(dimensionId: string): DimensionSignalMappingEntry | null {
  const m =
    (dimensionToSignalMappingFile as { mapping: Record<string, DimensionSignalMappingEntry> })
      .mapping ?? {}
  const entry = m?.[dimensionId]
  return entry ?? null
}
