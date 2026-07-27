import type {
  DimensionToSignalMappingFile,
  ExperienceDimensionsFile,
} from '../../src/conditions/schema'

export function dimensionMappingValues(
  dimension: ExperienceDimensionsFile['dimensions'][number],
  mapping: DimensionToSignalMappingFile['mapping'],
) {
  const id = String(dimension.id ?? '').trim()
  const entry = mapping[id]
  const definitionStrength = String(dimension.evidence_strength ?? '').trim()
  const definitionDoc = String(dimension.rationale_doc ?? '').trim()
  const entryStrength = entry?.evidence_strength
  const entryDoc = entry?.rationale_doc
  const strength = String(entryStrength ?? definitionStrength).trim() || 'unknown'
  const doc = String(entryDoc ?? definitionDoc).trim()
  return {
    id,
    label: String(dimension.label ?? id),
    entry,
    strength,
    doc,
  }
}
