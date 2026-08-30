/**
 * Read-only adapter for bundled experience-dimension metadata.
 *
 * IMPORTANT:
 * - `src/content/experience/**` JSON is treated as an application contract (read-only).
 * - This module only reads and re-exports structured data for the composer/UI.
 */
import experienceDimensionsFile from './experience-dimensions.json'
import { experienceDimensionsFileSchema } from '../../domain/experience/schema'
import { logger } from '../../platform/logger'
import type {
  EvidenceStrength,
  ExperienceDimensionDef,
} from '../../domain/experience/composition/types'

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
