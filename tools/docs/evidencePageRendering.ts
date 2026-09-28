import type { MotifClaim } from '../contracts/motifs/claims'
import {
  dimPage,
  motifIndexPage,
  motifPage,
  type EvidenceMatrixRow,
  type ExperienceDimensionDef,
  type ScientificSource,
} from './evidencePageFormatting'
import {
  deriveConditionPageModel,
  type ConditionPageModel,
  type ConditionReference,
  type DimensionReference,
} from './evidencePageModel'
import type { Profile } from './evidencePageParsing'

export function renderDimensionPage(
  dimension: ExperienceDimensionDef,
  claimsByKey: Map<string, MotifClaim>,
) {
  return dimPage(dimension, claimsByKey)
}

function renderConditionDimensions(dimensions: ConditionPageModel['dimensions']) {
  if (dimensions.length === 0) return 'This profile lists no dimensions.'
  return dimensions
    .map(
      (dimension) =>
        `- ${dimension.label} (\`${dimension.id}\`, weight ${Math.round(dimension.weight * 100)}%): Evidence: ${dimension.strength}: \`${dimension.doc}\``,
    )
    .join('\n')
}

function renderConditionMotifs(motifs: ConditionPageModel['motifs']) {
  if (motifs.length === 0) return 'This profile lists no motifs.'
  return motifs.map((motif) => `- \`${motif.id}\`: ${motif.summary}: \`${motif.doc}\``).join('\n')
}

export function renderConditionPage(
  profile: Profile,
  dimensionsById: Map<string, ExperienceDimensionDef>,
) {
  const model = deriveConditionPageModel(profile, dimensionsById)
  const dimensions = renderConditionDimensions(model.dimensions)
  const motifs = renderConditionMotifs(model.motifs)
  const warnings = model.warnings.length
    ? model.warnings.map((warning) => `- ${warning}`).join('\n')
    : '- Use Safe Mode or stop at any time.'
  return `# ${model.profile.label}: evidence summary

> Non-diagnostic framing: this summary explains which dimensions are used for this preset. It does not
> describe a diagnosis and does not claim clinical equivalence.

## Summary

- Condition preset: \`${model.profile.id}\`
- Experience evidence summary: ${model.aggregateLabel} (reported phenomena only)
- Scope: a curated composition of experience dimensions and conservative audiovisual motifs.
- Exclusions: not a diagnostic model, therapy tool, or statement about what a condition looks like.

${model.profile.summary ?? ''}

Profile weights express authoring emphasis, not symptom prevalence, severity, or diagnostic probability.

## Included experience dimensions

${dimensions}

## Evidence links (in-repo)

- [Interpretation boundaries and reviewed sources](../research/experience-interpretation.md)
- \`docs/references/README.md\` (evidence and method)
- \`docs/references/EVIDENCE_MATRIX.md\` (matrix)
- \`docs/references/MAPPING_SUMMARY.md\` (current mapping)

## Motifs used in this preset (quick traceability)

These motifs come from the actual bundled video and enabled audio stacks, so related dimension motifs
may differ. Each effect is an artistic or engineering choice; evidence for a reported experience does
not validate its visual form, sound, or parameter values.

${motifs}

## Safety notes / warnings shown in product

${warnings}
`
}

export function renderMotifIndexPage(motifs: string[]) {
  return motifIndexPage(motifs)
}

export function renderMotifPage(
  motif: string,
  dimensions: DimensionReference[],
  conditions: ConditionReference[],
  matrixByDim: Map<string, EvidenceMatrixRow>,
  claimsByKey: Map<string, MotifClaim>,
  sourcesByDim: Map<string, ScientificSource[]>,
) {
  return motifPage(motif, dimensions, conditions, matrixByDim, claimsByKey, sourcesByDim)
}
