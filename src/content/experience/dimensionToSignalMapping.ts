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

const parsedMapping = dimensionToSignalMappingFileSchema.safeParse(dimensionToSignalMappingFile)
if (!parsedMapping.success) {
  logger.warn('[dimensionToSignalMapping] Schema validation issues:', parsedMapping.error.issues)
}

export function getDimensionMappingEntry(dimensionId: string): DimensionSignalMappingEntry | null {
  if (!parsedMapping.success) return null
  return parsedMapping.data.mapping[dimensionId] ?? null
}
