/**
 * Read-only adapters for condition dimension metadata.
 *
 * IMPORTANT:
 * - `src/conditions/**` JSON is treated as an API contract (read-only).
 * - This module only reads and re-exports structured data for the composer/UI.
 */
// IMPORTANT: we import as text (`?raw`) so we can tolerate accidental extra content
// in the source file without modifying `src/conditions/**` (read-only contract).
import rawText from '../conditions/experience-dimensions.json?raw'
import { parseFirstJsonObject } from '../utils/jsonObjectParser'

export type EvidenceStrength = 'high' | 'medium' | 'low' | 'hypothesis' | string

export type ExperienceDimensionDef = {
  id: string
  label: string
  description: string
  safety?: string[]
  evidence_strength?: EvidenceStrength
  rationale_doc?: string
  motif_summary?: {
    video_nodes?: string[]
    audio_nodes?: string[]
  }
}

export type ExperienceDimensionsFile = {
  version?: string
  note?: string
  dimensions: ExperienceDimensionDef[]
}

export const experienceDimensionsFile = parseFirstJsonObject<ExperienceDimensionsFile>(rawText, {
  predicate(value) {
    const dims = (value as { dimensions?: unknown }).dimensions
    return Array.isArray(dims)
  },
})

export function getExperienceDimensions(): ExperienceDimensionDef[] {
  const dims = experienceDimensionsFile?.dimensions ?? []
  return Array.isArray(dims) ? dims.slice() : []
}
