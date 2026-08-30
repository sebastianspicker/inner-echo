/**
 * Read-only adapter for `src/content/experience/dimension-to-signal-mapping.json`.
 *
 * IMPORTANT:
 * - `src/content/experience/**` JSON is treated as an application contract (read-only).
 */

import dimensionToSignalMappingFile from './dimension-to-signal-mapping.json'
import { dimensionToSignalMappingFileSchema } from '../../domain/experience/schema'
import { logger } from '../../platform/logger'
import type {
  MotifDef,
  DimensionSignalMappingEntry,
} from '../../domain/experience/composition/types'

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
