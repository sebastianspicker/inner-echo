/**
 * Read-only adapter for `src/conditions/dimension-to-signal-mapping.json`.
 *
 * IMPORTANT:
 * - `src/conditions/**` JSON is treated as an API contract (read-only).
 * - We import as raw text (`?raw`) and parse the *first* JSON object defensively.
 */

import rawText from '../conditions/dimension-to-signal-mapping.json?raw'
import { parseFirstJsonObject } from '../utils/jsonObjectParser'
import type { MotifDef, DimensionSignalMappingEntry } from './types'

// Re-export types for backward compatibility
export type { MotifDef, DimensionSignalMappingEntry }

export type DimensionToSignalMappingFile = {
  version?: string
  note?: string
  mapping: Record<string, DimensionSignalMappingEntry>
}

export const dimensionToSignalMappingFile =
  parseFirstJsonObject<DimensionToSignalMappingFile>(rawText, {
    predicate(value) {
      const mapping = (value as { mapping?: unknown }).mapping
      return mapping != null && typeof mapping === 'object' && !Array.isArray(mapping)
    },
  })

export function getDimensionMappingEntry(dimensionId: string): DimensionSignalMappingEntry | null {
  const m = dimensionToSignalMappingFile?.mapping ?? {}
  const entry = m?.[dimensionId]
  return entry ?? null
}
