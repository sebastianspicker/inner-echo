import { type MotifClaim, type MotifClaimLabel } from './motifClaims'

export type EvidenceStrength = 'high' | 'medium' | 'low' | 'hypothesis' | string

export type ExperienceDimensionDef = {
  id: string
  label: string
  description: string
  safety?: string[]
  evidence_strength?: EvidenceStrength
  rationale_doc?: string
  motif_summary?: { video_nodes?: string[]; audio_nodes?: string[] }
}

export type EvidenceMatrixRow = {
  dimensionId: string
  corpusLink?: string
}

export type ScientificSource = {
  /** Full citation line as present in the corpus (usually includes a doi.org link). */
  citation: string
  doi: string
  doiUrl: string
  /** Which corpus file it came from. */
  corpusPath: string
  /** Dimension section that contributed this source. */
  dimensionId: string
}

export function strengthLabel(s?: string) {
  const labels: Record<string, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    hypothesis: 'Hypothesis (evidence gap)',
  }
  const fallback = String(s || 'Unrated')
  return labels[fallback.toLowerCase()] || fallback
}

export function nodeTechnicalSummary(node: string) {
  const n = node.toLowerCase()
  // Keep this strictly technical (what it does), not psychological claims.
  const map: Record<string, string> = {
    grain: 'Adds fine noise texture (clamped).',
    vignette: 'Darkens edges to narrow the frame (static or gently modulated).',
    edge_sharpen: 'Subtle edge enhancement (non-flickering).',
    chroma_aberration: 'Minor RGB channel offset near edges (very low).',
    chromatic_aberration: 'Minor RGB channel offset near edges (very low).',
    temporal_smear: 'Blends previous frames for persistence/smear (feedback clamped).',
    color_grade: 'Adjusts saturation/contrast/tonal balance (clamped).',
    haze: 'Adds soft fog/veil (clamped).',
    soft_blur: 'Applies mild blur to reduce sharp detail (clamped).',
    pulse: 'Slow, bounded envelope modulation (no strobe).',
    interference: 'Adds gentle distortion artifacts (clamped; no strobe).',
    focus_jitter: 'Small, smoothed focal instability (bounded).',
    feedback_loop: 'Low-feedback image recurrence (bounded; reduced-motion disables).',
    grid_hint: 'Subtle grid overlay hint (very low contrast).',

    compressor_limiter: 'Reduces peaks and smooths dynamics (safety-first).',
    lowpass: 'Attenuates high frequencies above cutoff (clamped).',
    highpass: 'Attenuates low frequencies below cutoff (clamped).',
    tremolo: 'Slow amplitude modulation (rate/depth clamped).',
    delay: 'Short echo with low feedback/mix (clamped).',
    flutter: 'Low-depth pitch/phase wobble (clamped).',
    reverb: 'Adds gentle space/decay (clamped).',
    noise_bed: 'Adds quiet broadband noise floor (clamped).',
    pulse_tone: 'Adds a soft tone pulse (level clamped).',
  }
  return map[n] ?? 'Implementation node (see engine source).'
}

function claimLabelTitle(label: MotifClaimLabel) {
  if (label === 'supported') return 'Supported'
  if (label === 'mixed') return 'Mixed'
  if (label === 'artistic') return 'Artistic'
  return 'Hypothesis'
}

export function motifIndexPage(motifs: string[]) {
  const items = motifs
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((m) => `- [\`${m}\`](./${m}.md): ${nodeTechnicalSummary(m)}`)
    .join('\n')

  return `# Motif / node index

This index lists audiovisual motifs (video and audio nodes) and links to their evidence pages.

It is generated from the motifs referenced by
\`src/conditions/experience-dimensions.json\`. Review the source data and
in-repository evidence corpus; do not treat this index as an independent
research document.

> Important: evidence in this project primarily supports experience dimensions and reported phenomena. A specific node is an artistic and engineering implementation of a metaphor and must be interpreted cautiously.

## Motifs

${items}
`
}

function motifDimensionCorpusPart(
  dimensionId: string,
  matrixByDim: Map<string, EvidenceMatrixRow>,
) {
  const corpus = matrixByDim.get(dimensionId)?.corpusLink
  return corpus ? `: corpus: \`${corpus}\`` : ''
}

function motifClaimSourcesPart(claim: MotifClaim | undefined) {
  const sources = claim?.sources ?? []
  return sources.length
    ? `: claim sources: ${sources.map((source) => `\`${source}\``).join(', ')}`
    : ''
}

function motifDimensionLine(
  motif: string,
  dimension: { id: string; label: string; strength: string; doc: string },
  matrixByDim: Map<string, EvidenceMatrixRow>,
  claimsByKey: Map<string, MotifClaim>,
) {
  const claim = claimsByKey.get(`${dimension.id}|${motif}`)
  const claimTitle = claimLabelTitle(claim?.label ?? 'mixed')
  const corpusPart = motifDimensionCorpusPart(dimension.id, matrixByDim)
  const claimSourcesPart = motifClaimSourcesPart(claim)
  return `- ${dimension.label} (\`${dimension.id}\`): Evidence (dimension): ${dimension.strength}: Claim: ${claimTitle}: \`${dimension.doc}\`${corpusPart}${claimSourcesPart}`
}

function motifDimensionList(
  motif: string,
  dimensions: Array<{ id: string; label: string; strength: string; doc: string }>,
  matrixByDim: Map<string, EvidenceMatrixRow>,
  claimsByKey: Map<string, MotifClaim>,
) {
  return dimensions
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((dimension) => motifDimensionLine(motif, dimension, matrixByDim, claimsByKey))
    .join('\n')
}

function motifConditionList(conditions: Array<{ id: string; label: string; doc: string }>) {
  return conditions
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((condition) => `- ${condition.label} (\`${condition.id}\`): \`${condition.doc}\``)
    .join('\n')
}

function motifScientificSources(
  dimensions: Array<{ id: string }>,
  sourcesByDim: Map<string, ScientificSource[]>,
) {
  const sources: ScientificSource[] = []
  const seen = new Set<string>()
  for (const dimension of dimensions) {
    for (const source of sourcesByDim.get(dimension.id) ?? []) {
      if (seen.has(source.doi)) continue
      seen.add(source.doi)
      sources.push(source)
    }
  }
  return sources.sort((a, b) => a.doi.localeCompare(b.doi))
}

function motifScientificSourcesMarkdown(sources: ScientificSource[]) {
  if (sources.length === 0) {
    return 'No DOI sources were extracted for the dimensions currently using this motif.'
  }
  return sources
    .map(
      (source) =>
        `- ${source.citation}\n  DOI: ${source.doiUrl} (\`${source.doi}\`): from \`${source.corpusPath}\``,
    )
    .join('\n')
}

function motifPageIntroduction(motif: string) {
  return `# \`${motif}\`: motif evidence

> Generated reference: this page summarizes the current composer mapping and
> in-repository corpus. It is not an independent research document.

> Non-diagnostic metaphor framing: This page documents how an audiovisual motif is used as a design metaphor. It does not diagnose and does not claim clinical equivalence.

## Technical summary

${nodeTechnicalSummary(motif)}

## Evidence and implementation

- Evidence-backed in this project refers to reported phenomena in the evidence corpus. See the dimension pages and matrix.
- This node is an artistic and engineering implementation used to represent those phenomena metaphorically.
- The usual claim level is Mixed: the phenomenon is supported, while the motif choice and implementation remain interpretive.

## Where this motif is used (traceability)

### Used by dimensions

`
}

function motifPageConclusion(condList: string, sourcesMd: string) {
  return `

### Used by condition presets

${condList || 'Not currently referenced by any condition preset.'}

## Scientific sources (peer-reviewed; from in-repo corpus)

These sources come from evidence-corpus sections for the dimensions that currently use this motif.

> Important: these papers support the phenomena described by the dimensions. They do not claim that this specific node is a biomarker or uniquely correct.

${sourcesMd}

## Safety notes (implementation constraints)

- Keep outputs bounded: no strobe, no harsh audio spikes, no runaway feedback.
- Respect Safe Mode and Reduced Motion (temporal nodes should be disabled/reduced).
- Provide “Stop Everything” and keep the motif user-controlled.

## Sources (in-repo)

- \`docs/references/EVIDENCE_MATRIX.md\`
- \`docs/references/MAPPING_SUMMARY.md\`
- \`docs/references/research/initial-dimensions.md\`
- \`docs/references/research/remaining-dimensions.md\`
`
}

export function motifPage(
  motif: string,
  usedByDims: Array<{ id: string; label: string; strength: string; doc: string }>,
  usedByConditions: Array<{ id: string; label: string; doc: string }>,
  matrixByDim: Map<string, EvidenceMatrixRow>,
  claimsByKey: Map<string, MotifClaim>,
  sourcesByDim: Map<string, ScientificSource[]>,
) {
  const dimsList = motifDimensionList(motif, usedByDims, matrixByDim, claimsByKey)
  const condList = motifConditionList(usedByConditions)
  const sourcesMd = motifScientificSourcesMarkdown(motifScientificSources(usedByDims, sourcesByDim))

  return `${motifPageIntroduction(motif)}${dimsList || 'Not currently referenced by any dimension.'}${motifPageConclusion(condList, sourcesMd)}`
}

function dimensionNodes(nodes: string[]) {
  return nodes.length ? nodes.map((node) => `\`${node}\``).join(', ') : 'none'
}

function dimMotifRow(
  dim: ExperienceDimensionDef,
  motif: { node: string },
  rationale: string,
  claimsByKey: Map<string, MotifClaim>,
) {
  const curated = claimsByKey.get(`${dim.id}|${motif.node}`)
  return `| \`${motif.node}\` | ${nodeTechnicalSummary(motif.node)} | ${claimLabelTitle(dimClaimLabel(dim, curated))} | ${strengthLabel(dim.evidence_strength)} | ${dimMotifSources(rationale, motif.node, curated)} |`
}

function dimClaimLabel(dim: ExperienceDimensionDef, claim: MotifClaim | undefined) {
  const evidenceStrength = dim.evidence_strength ?? ''
  if (evidenceStrength.toLowerCase() === 'hypothesis') return 'hypothesis'
  return claim?.label ?? 'mixed'
}

function dimMotifSources(rationale: string, motif: string, claim: MotifClaim | undefined) {
  const sources = [
    `\`${rationale}\``,
    '`docs/references/EVIDENCE_MATRIX.md`',
    `\`docs/references/motifs/${motif}.md\``,
  ]
  const claimSources = claim?.sources?.map((source) => `\`${source}\``).join(', ')
  if (claimSources) sources.push(claimSources)
  return sources.join(', ')
}

function dimMotifRows(
  dim: ExperienceDimensionDef,
  motifs: Array<{ node: string }>,
  rationale: string,
  claimsByKey: Map<string, MotifClaim>,
) {
  if (motifs.length === 0) return '| none | n/a | n/a | n/a | n/a |'
  return motifs.map((motif) => dimMotifRow(dim, motif, rationale, claimsByKey)).join('\n')
}

function dimPageIntroduction(
  dim: ExperienceDimensionDef,
  strength: string,
  video: string[],
  audio: string[],
) {
  return `# ${dim.label}

> Generated reference: this page summarizes the current dimension definition,
> mapping, and in-repository corpus. It is not an independent research document.

> Non-diagnostic metaphor framing: This page supports design rationale for audiovisual metaphors. It does not diagnose or simulate a disorder.

## Summary

- Dimension: \`${dim.id}\`
- Repository definition: ${dim.description}
- Evidence strength: ${strength}

## What the product maps (default motifs)

These are the conservative default-enabled motifs used by the composer when this dimension is selected:

- Video nodes: ${dimensionNodes(video)}
- Audio nodes: ${dimensionNodes(audio)}

## Motif-by-motif traceability (evidence vs likelihood vs artistic)

Each motif below includes:

- a short technical summary of what the implementation does
- a claim label: Supported, Mixed, Hypothesis, or Artistic
- in-repository sources that readers can verify

| Motif (node) | What the implementation does | Claim label | Likelihood label | Sources |
|---|---|---|---|---|
`
}

function dimPageConclusion(safety: string[], rationale: string) {
  const safetyNotes = safety.length
    ? safety.map((note) => `- ${note}`).join('\n')
    : '- Keep modulation smooth, bounded, and user-controlled.'
  return `

## Evidence links (in-repo)

- Matrix row: \`docs/references/EVIDENCE_MATRIX.md\`
- Current mapping: \`docs/references/MAPPING_SUMMARY.md\`
- Long-form corpus:
  - \`docs/references/research/initial-dimensions.md\`
  - \`docs/references/research/remaining-dimensions.md\`

> Note: this page intentionally avoids introducing new external citations beyond the in-repo corpus. Bibliographies live in the research notes above.

## Safety notes (must remain true in the product)

${safetyNotes}

## Claim labeling

- Supported: the corpus supports the phenomenon and a conservative mapping is plausible.
- Mixed: the phenomenon is supported, but the specific motif choice is interpretive.
- Hypothesis: evidence gap; keep conservative and off by default.

## Rationale doc path (self-reference)

- \`${rationale}\`
`
}

export function dimPage(dim: ExperienceDimensionDef, claimsByKey: Map<string, MotifClaim>) {
  const values = dimPageValues(dim)
  return `${dimPageIntroduction(dim, values.strength, values.video, values.audio)}${dimMotifRows(dim, values.motifs, values.rationale, claimsByKey)}${dimPageConclusion(values.safety, values.rationale)}`
}

function dimPageValues(dim: ExperienceDimensionDef) {
  const video = dim.motif_summary?.video_nodes ?? []
  const audio = dim.motif_summary?.audio_nodes ?? []
  const motifs = dimMotifs(video, audio)
  return { ...dimPageBasics(dim), audio, motifs, video }
}

function dimPageBasics(dim: ExperienceDimensionDef) {
  const strength = strengthLabel(dim.evidence_strength)
  const safety = dim.safety ?? []
  const rationale = dim.rationale_doc ?? `docs/references/dimensions/${dim.id}.md`
  return { rationale, safety, strength }
}

function dimMotifs(video: string[], audio: string[]) {
  return [
    ...video.map((v) => ({ kind: 'video', node: v })),
    ...audio.map((a) => ({ kind: 'audio', node: a })),
  ]
}
