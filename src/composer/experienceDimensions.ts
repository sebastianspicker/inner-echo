/**
 * Read-only adapters for condition dimension metadata.
 *
 * IMPORTANT:
 * - `src/conditions/**` JSON is treated as an API contract (read-only).
 * - This module only reads and re-exports structured data for the composer/UI.
 */
import experienceDimensionsFile from '../conditions/experience-dimensions.json'
import { experienceDimensionsFileSchema } from '../conditions/schema'
import { logger } from '../utils/logger'
import type { EvidenceStrength, ExperienceDimensionDef } from './types'

export type { EvidenceStrength, ExperienceDimensionDef }

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
