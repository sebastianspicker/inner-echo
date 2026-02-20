/**
 * Read-only adapter for `src/conditions/dimension-to-signal-mapping.json`.
 *
 * IMPORTANT:
 * - `src/conditions/**` JSON is treated as an API contract (read-only).
 * - We import as raw text (`?raw`) and parse the *first* JSON object defensively.
 */

import rawText from '../conditions/dimension-to-signal-mapping.json?raw'
import { parseFirstJsonObject } from '../utils/jsonObjectParser'

export type MotifDef = {
  node: string
  params_hint?: Record<string, unknown>
}

export type DimensionSignalMappingEntry = {
  evidence_strength?: string
  rationale_doc?: string
  notes?: string
  safety?: {
    warnings?: string[]
    clamps?: Record<string, unknown>
    reduced_motion?: { disable_nodes?: string[]; note?: string }
  }
  video_motifs?: MotifDef[]
  audio_motifs?: MotifDef[]
  avoid?: Record<string, unknown>
}

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
