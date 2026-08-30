/**
 * Generate evidence pages from SSOT JSON (read-only) into docs/references.
 *
 * Goals:
 * - Keep docs navigable and non-diagnostic.
 * - Avoid adding new external claims; cite only in-repo corpus pages.
 * - Ensure every dimension and condition has an evidence page.
 *
 * IMPORTANT: Do NOT modify `src/content/experience/**` files (read-only contract).
 */

import fs from 'node:fs'
import path from 'node:path'
import { parseFirstJsonObject } from '../shared/json/jsonObjectParser'
import {
  dimPage,
  motifIndexPage,
  motifPage,
  nodeTechnicalSummary,
  strengthLabel,
  type EvidenceMatrixRow,
  type ExperienceDimensionDef,
  type ScientificSource,
} from './evidencePageFormatting'
import { parseMotifClaims, type MotifClaim } from '../contracts/motifs/claims'

type ExperienceDimensionsFile = {
  version?: string
  note?: string
  dimensions: ExperienceDimensionDef[]
}

type Profile = {
  id: string
  label: string
  summary?: string
  experience_dimensions?: Array<{ id: string; weight: number }>
  safety?: { warnings?: string[] }
}

function readJsonFirstObject<T>(filePath: string) {
  const text = fs.readFileSync(filePath, 'utf-8')
  return parseFirstJsonObject(text) as T
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeFileIfChanged(filePath: string, contents: string) {
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null
  if (prev === contents) return
  fs.writeFileSync(filePath, contents, 'utf-8')
}

function normalizeStrength(s?: string) {
  const x = String(s ?? '').toLowerCase()
  if (x === 'high') return 'high'
  if (x === 'medium') return 'medium'
  if (x === 'low') return 'low'
  if (x === 'hypothesis') return 'hypothesis'
  return 'unrated'
}

function parseEvidenceMatrix(root: string) {
  const filePath = path.join(root, 'docs/references/EVIDENCE_MATRIX.md')
  if (!fs.existsSync(filePath)) return new Map()
  const text = fs.readFileSync(filePath, 'utf-8')
  const lines = text.split('\n')
  const out = new Map<string, EvidenceMatrixRow>()
  for (const line of lines) {
    if (!line.startsWith('|')) continue
    // Expect something like:
    // | hyperarousal | ... | `docs/references/research/initial-dimensions.md` | High |
    const cols = line.split('|').map((c) => c.trim())
    if (cols.length < 6) continue
    const dimCol = cols[1] ?? ''
    const corpusCol = cols[5] ?? ''
    const m = dimCol.match(/^`?([a-z0-9_]+)`?$/i)
    if (!m?.[1]) continue
    const dimensionId = m[1]
    const corpus = corpusCol.match(/`([^`]+)`/)?.[1]
    out.set(dimensionId, { dimensionId, corpusLink: corpus })
  }
  return out
}

function extractDois(text: string) {
  const dois = new Set<string>()
  // Match either doi.org URLs or raw DOI tokens.
  const re =
    /(https?:\/\/doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Z0-9]+))|\b(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const doi = (m[2] ?? m[3] ?? '').trim()
    if (doi) dois.add(doi)
  }
  return Array.from(dois)
}

type PendingCitation = { line: string; dois: string[] }

type CorpusParseState = {
  currentDim: string | null
  inBib: boolean
  pendingCitation: PendingCitation | null
  inMarkdownBlock: boolean
}

function addPendingCitation(
  state: CorpusParseState,
  corpusPath: string,
  sourcesByDimension: Map<string, ScientificSource[]>,
) {
  if (!state.currentDim || !state.pendingCitation) return
  const [doi] = state.pendingCitation.dois
  if (!doi) return
  const sources = sourcesByDimension.get(state.currentDim) ?? []
  sources.push({
    citation: state.pendingCitation.line,
    doi,
    doiUrl: `https://doi.org/${doi}`,
    corpusPath,
    dimensionId: state.currentDim,
  })
  sourcesByDimension.set(state.currentDim, sources)
  state.pendingCitation = null
}

function updateMarkdownBlock(state: CorpusParseState, line: string, flush: () => void) {
  if (!line.trimStart().startsWith('```')) return false
  const fence = line.trim()
  if (!state.inMarkdownBlock && fence.toLowerCase().startsWith('```markdown')) {
    state.inMarkdownBlock = true
  } else if (state.inMarkdownBlock) {
    flush()
    state.inMarkdownBlock = false
    state.inBib = false
  }
  return true
}

function dimensionHeading(line: string, inMarkdownBlock: boolean) {
  const fileFor = line.match(/^##\s+File\s+for\s+([a-z0-9_]+)\s*$/i)
  const h1 = inMarkdownBlock ? line.match(/^#\s+([a-z0-9_]+)\s*$/i) : null
  return { fileFor, h1, dimensionId: fileFor?.[1] ?? h1?.[1] }
}

function updateBibliographyState(
  state: CorpusParseState,
  line: string,
  hasDimensionHeading: boolean,
  flush: () => void,
) {
  if (/^##\s+Bibliography\b/i.test(line)) {
    flush()
    state.inBib = true
    return true
  }
  if (state.inBib && /^##\s+/.test(line) && !/^##\s+Bibliography\b/i.test(line)) {
    flush()
    state.inBib = false
    state.currentDim = null
    return true
  }
  if (!state.inBib && /^##\s+/.test(line) && !hasDimensionHeading) {
    state.currentDim = null
    return true
  }
  return false
}

function updatePendingCitation(state: CorpusParseState, line: string, flush: () => void) {
  if (line.startsWith('- ')) {
    flush()
    const citationLine = line.slice(2).trim()
    const dois = extractDois(citationLine)
    state.pendingCitation = dois.length ? { line: citationLine, dois } : null
    return
  }
  if (state.pendingCitation && /^\s*DOI:\s*/i.test(line)) {
    const doi = extractDois(line)[0]
    if (doi && !state.pendingCitation.dois.includes(doi)) state.pendingCitation.dois.unshift(doi)
  }
}

function parseCorpusSourceLine(line: string, state: CorpusParseState, flush: () => void) {
  if (updateMarkdownBlock(state, line, flush)) return

  const heading = dimensionHeading(line, state.inMarkdownBlock)
  if (heading.dimensionId) {
    flush()
    state.currentDim = heading.dimensionId.toLowerCase()
    state.inBib = false
    return
  }
  if (!state.currentDim) return
  if (updateBibliographyState(state, line, Boolean(heading.fileFor || heading.h1), flush)) return
  if (state.inBib) updatePendingCitation(state, line, flush)
}

function parseCorpusSourceFile(
  root: string,
  corpusPath: string,
  sourcesByDimension: Map<string, ScientificSource[]>,
) {
  const filePath = path.join(root, corpusPath)
  if (!fs.existsSync(filePath)) return
  const state: CorpusParseState = {
    currentDim: null,
    inBib: false,
    pendingCitation: null,
    inMarkdownBlock: false,
  }
  const flush = () => addPendingCitation(state, corpusPath, sourcesByDimension)

  for (const line of fs.readFileSync(filePath, 'utf-8').split('\n'))
    parseCorpusSourceLine(line, state, flush)

  flush()
}

function deduplicateSourcesByDimension(sourcesByDimension: Map<string, ScientificSource[]>) {
  for (const [dimensionId, sources] of sourcesByDimension.entries()) {
    const seen = new Set<string>()
    const uniqueSources = sources.filter((source) => {
      if (seen.has(source.doi)) return false
      seen.add(source.doi)
      return true
    })
    sourcesByDimension.set(dimensionId, uniqueSources)
  }
}

function parseCorpusSourcesByDimension(root: string) {
  const corpusPaths = [
    'docs/references/research/initial-dimensions.md',
    'docs/references/research/remaining-dimensions.md',
  ]
  const out = new Map<string, ScientificSource[]>()

  for (const corpusPath of corpusPaths) parseCorpusSourceFile(root, corpusPath, out)
  deduplicateSourcesByDimension(out)

  return out
}

function conditionStrength(
  dimensions: Array<{ id: string; weight: number }>,
  dimsById: Map<string, ExperienceDimensionDef>,
) {
  const strengthRank: Record<string, number> = {
    hypothesis: 0,
    low: 1,
    medium: 2,
    high: 3,
    unrated: 4,
  }
  const rankToStrength = ['hypothesis', 'low', 'medium', 'high', 'unrated'] as const
  let minRank = strengthRank.unrated
  for (const dimension of dimensions) {
    const strength = normalizeStrength(dimsById.get(dimension.id)?.evidence_strength)
    minRank = Math.min(minRank, strengthRank[strength] ?? strengthRank.unrated)
  }
  const aggregate = rankToStrength[minRank] ?? 'unrated'
  return strengthLabel(aggregate === 'unrated' ? undefined : aggregate)
}

function conditionMotifs(
  dimensions: Array<{ id: string; weight: number }>,
  dimsById: Map<string, ExperienceDimensionDef>,
) {
  const motifs = new Set<string>()
  for (const dimension of dimensions) {
    const definition = dimsById.get(dimension.id)
    for (const node of definition?.motif_summary?.video_nodes ?? []) motifs.add(node)
    for (const node of definition?.motif_summary?.audio_nodes ?? []) motifs.add(node)
  }
  return Array.from(motifs).sort((a, b) => a.localeCompare(b))
}

function conditionDimensionList(
  dimensions: Array<{ id: string; weight: number }>,
  dimsById: Map<string, ExperienceDimensionDef>,
) {
  if (dimensions.length === 0) return 'No dimensions are listed in this profile.'
  return dimensions
    .map((dimension) => {
      const definition = dimsById.get(dimension.id)
      const label = definition?.label ?? dimension.id
      const strength = strengthLabel(definition?.evidence_strength)
      const doc = definition?.rationale_doc ?? `docs/references/dimensions/${dimension.id}.md`
      return `- ${label} (\`${dimension.id}\`, weight ${Math.round(dimension.weight * 100)}%): Evidence: ${strength}: \`${doc}\``
    })
    .join('\n')
}

function conditionMotifList(motifs: string[]) {
  if (motifs.length === 0) return 'No motifs are listed.'
  return motifs
    .map(
      (motif) =>
        `- \`${motif}\`: ${nodeTechnicalSummary(motif)}: \`docs/references/motifs/${motif}.md\``,
    )
    .join('\n')
}

function conditionPage(profile: Profile, dimsById: Map<string, ExperienceDimensionDef>) {
  const dims = (profile.experience_dimensions ?? [])
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
  const warnings = profile.safety?.warnings ?? []
  const aggregateLabel = conditionStrength(dims, dimsById)
  const motifs = conditionMotifs(dims, dimsById)

  return `# ${profile.label}: evidence summary

> Non-diagnostic metaphor framing: This summary explains which dimensions are used for this preset. It does not describe a diagnosis and does not claim clinical equivalence.

## Summary

- Condition preset: \`${profile.id}\`
- Evidence summary: ${aggregateLabel}
- Scope: a curated composition of experience dimensions and conservative audiovisual motifs.
- Exclusions: not a diagnostic model, therapy tool, or statement about what a condition looks like.

## Included experience dimensions

${conditionDimensionList(dims, dimsById)}

## Evidence links (in-repo)

- \`docs/references/README.md\` (Evidence & Method)
- \`docs/references/EVIDENCE_MATRIX.md\` (matrix)
- \`docs/references/MAPPING_SUMMARY.md\` (current mapping)

## Motifs used in this preset (quick traceability)

These motifs are used by the included dimensions. Each motif is an artistic and engineering implementation of a metaphor; the evidence applies primarily to the dimension phenomena.

${conditionMotifList(motifs)}

## Safety notes / warnings shown in product

${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '- Use Safe Mode or stop at any time.'}
`
}

function loadDimensions(root: string) {
  return (
    readJsonFirstObject<ExperienceDimensionsFile>(
      path.join(root, 'src/content/experience/experience-dimensions.json'),
    ).dimensions ?? []
  )
}

function loadProfiles(root: string) {
  const profilesDir = path.join(root, 'src/content/experience/profiles')
  const files = fs.readdirSync(profilesDir).filter((file) => file.endsWith('.json'))
  return files.map((file) => readJsonFirstObject<Profile>(path.join(profilesDir, file)))
}

function allMotifs(dimensions: ExperienceDimensionDef[]) {
  const motifs = new Set<string>()
  for (const dimension of dimensions) {
    for (const node of dimension.motif_summary?.video_nodes ?? []) motifs.add(node)
    for (const node of dimension.motif_summary?.audio_nodes ?? []) motifs.add(node)
  }
  return Array.from(motifs)
}

function usedByDimensions(motif: string, dimensions: ExperienceDimensionDef[]) {
  return dimensions.flatMap((dimension) => {
    const nodes = [
      ...(dimension.motif_summary?.video_nodes ?? []),
      ...(dimension.motif_summary?.audio_nodes ?? []),
    ]
    if (!nodes.includes(motif)) return []
    return [
      {
        id: dimension.id,
        label: dimension.label,
        strength: strengthLabel(dimension.evidence_strength),
        doc: dimension.rationale_doc ?? `docs/references/dimensions/${dimension.id}.md`,
      },
    ]
  })
}

function usedByConditions(usedDimensions: Array<{ id: string }>, profiles: Profile[]) {
  const usedIds = new Set(usedDimensions.map((dimension) => dimension.id))
  return profiles.flatMap((profile) => {
    const dimensionIds = (profile.experience_dimensions ?? []).map((dimension) => dimension.id)
    if (!dimensionIds.some((id) => usedIds.has(id))) return []
    return [
      {
        id: profile.id,
        label: profile.label,
        doc: `docs/references/conditions/${profile.id}.md`,
      },
    ]
  })
}

function writeEvidencePages(
  root: string,
  dimensions: ExperienceDimensionDef[],
  profiles: Profile[],
  claimsByKey: Map<string, MotifClaim>,
  matrixByDim: Map<string, EvidenceMatrixRow>,
  sourcesByDim: Map<string, ScientificSource[]>,
) {
  const dimensionsById = new Map(dimensions.map((dimension) => [dimension.id, dimension]))
  const dimensionsDir = path.join(root, 'docs/references/dimensions')
  const conditionsDir = path.join(root, 'docs/references/conditions')
  const motifsDir = path.join(root, 'docs/references/motifs')
  ensureDir(dimensionsDir)
  ensureDir(conditionsDir)
  ensureDir(motifsDir)
  for (const dimension of dimensions) {
    writeFileIfChanged(
      path.join(dimensionsDir, `${dimension.id}.md`),
      dimPage(dimension, claimsByKey),
    )
  }
  for (const profile of profiles) {
    writeFileIfChanged(
      path.join(conditionsDir, `${profile.id}.md`),
      conditionPage(profile, dimensionsById),
    )
  }
  const motifs = allMotifs(dimensions)
  writeFileIfChanged(path.join(motifsDir, 'INDEX.md'), motifIndexPage(motifs))
  for (const motif of motifs) {
    const dimensionsForMotif = usedByDimensions(motif, dimensions)
    const conditionsForMotif = usedByConditions(dimensionsForMotif, profiles)
    writeFileIfChanged(
      path.join(motifsDir, `${motif}.md`),
      motifPage(
        motif,
        dimensionsForMotif,
        conditionsForMotif,
        matrixByDim,
        claimsByKey,
        sourcesByDim,
      ),
    )
  }
  return motifs.length
}

function main() {
  const root = process.cwd()
  const dims = loadDimensions(root).slice()
  const profiles = loadProfiles(root)
  const matrixByDim = parseEvidenceMatrix(root)
  const claimsByKey = parseMotifClaims(root)
  const sourcesByDim = parseCorpusSourcesByDimension(root)
  const motifCount = writeEvidencePages(
    root,
    dims,
    profiles,
    claimsByKey,
    matrixByDim,
    sourcesByDim,
  )

  console.log(
    `[evidence-pages-gen] Wrote ${dims.length} dimension page(s), ${profiles.length} condition page(s), ${motifCount} motif page(s).`,
  )
}

main()
