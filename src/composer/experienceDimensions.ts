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
import { experienceDimensionsFileSchema } from '../conditions/schema'
import { logger } from '../utils/logger'
import type { EvidenceStrength, ExperienceDimensionDef } from './types'

// Re-export types for backward compatibility
export type { EvidenceStrength, ExperienceDimensionDef }

type ExperienceDimensionsFile = {
  version?: string
  note?: string
  dimensions: ExperienceDimensionDef[]
}

const experienceDimensionsFile = parseFirstJsonObject<ExperienceDimensionsFile>(rawText, {
  predicate(value) {
    const dims = (value as { dimensions?: unknown }).dimensions
    return Array.isArray(dims)
  },
})

// Validate parsed data against Zod schema (log-only — never reject at runtime)
{
  const result = experienceDimensionsFileSchema.safeParse(experienceDimensionsFile)
  if (!result.success) {
    logger.warn('[experienceDimensions] Schema validation issues:', result.error.issues)
  }
}

export function getExperienceDimensions(): ExperienceDimensionDef[] {
  const dims = experienceDimensionsFile?.dimensions ?? []
  return Array.isArray(dims) ? dims.slice() : []
}
