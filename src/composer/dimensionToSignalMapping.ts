/**
 * Read-only adapter for `src/conditions/dimension-to-signal-mapping.json`.
 *
 * IMPORTANT:
 * - `src/conditions/**` JSON is treated as an API contract (read-only).
 * - We import as raw text (`?raw`) and parse the *first* JSON object defensively.
 */

import rawText from '../conditions/dimension-to-signal-mapping.json?raw'
import { parseFirstJsonObject } from '../utils/jsonObjectParser'
import { dimensionToSignalMappingFileSchema } from '../conditions/schema'
import { logger } from '../utils/logger'
import type { MotifDef, DimensionSignalMappingEntry } from './types'

// Re-export types for backward compatibility
export type { MotifDef, DimensionSignalMappingEntry }

type DimensionToSignalMappingFile = {
  version?: string
  note?: string
  mapping: Record<string, DimensionSignalMappingEntry>
}

const dimensionToSignalMappingFile =
  parseFirstJsonObject<DimensionToSignalMappingFile>(rawText, {
    predicate(value) {
      const mapping = (value as { mapping?: unknown }).mapping
      return mapping != null && typeof mapping === 'object' && !Array.isArray(mapping)
    },
  })

// Validate parsed data against Zod schema (log-only — never reject at runtime)
{
  const result = dimensionToSignalMappingFileSchema.safeParse(dimensionToSignalMappingFile)
  if (!result.success) {
    logger.warn('[dimensionToSignalMapping] Schema validation issues:', result.error.issues)
  }
}

export function getDimensionMappingEntry(dimensionId: string): DimensionSignalMappingEntry | null {
  const m = dimensionToSignalMappingFile?.mapping ?? {}
  const entry = m?.[dimensionId]
  return entry ?? null
}
