/**
 * Build-time verification for evidence traceability.
 *
 * Fails if:
 * - any dimension in `src/content/experience/experience-dimensions.json` lacks a rationale_doc or it doesn't exist
 * - any dimension mapping entry declares a rationale_doc that doesn't exist
 * - any experience profile in `src/content/experience/profiles/*.json` lacks a corresponding `docs/references/conditions/<id>.md`
 * - canonical evidence IA files are missing
 * - a motif claim has an unknown label, dimension or motif
 * - no DOI source can be extracted from the research corpus
 * - a generated evidence page is stale
 *
 * IMPORTANT: Does not modify `src/content/experience/**` (read-only).
 */

import fs from 'node:fs'
import path from 'node:path'
import type {
  DimensionToSignalMappingFile,
  ExperienceDimensionDef,
  ExperienceDimensionsFile,
} from '../../src/domain/experience/schema'
import { parseMotifClaims } from '../contracts/motifs/claims'
import type { MotifClaim, MotifClaimLabel } from '../contracts/motifs/claims'
import {
  loadDimensions,
  loadProfiles,
  parseCorpusSourcesByDimension,
  parseEvidenceMatrix,
} from './evidencePageParsing'
import { writeEvidencePages } from './evidencePageWriting'
import { checkMappingSummary } from './mapping-summary'
import { loadRepoJson } from './repoJson'

type Profile = { id: string }
type MotifClaimsFile = { claims?: MotifClaim[] }

function exists(root: string, p: string) {
  return fs.existsSync(path.join(root, p))
}

function verifyRequiredFiles(root: string, errors: string[]) {
  const requiredFiles = [
    'docs/references/README.md',
    'docs/references/INDEX.md',
    'docs/references/EVIDENCE_MATRIX.md',
    'docs/references/motifs/INDEX.md',
    'docs/references/CONTRIBUTIONS_AND_LIMITS.md',
    'docs/references/MAPPING_SUMMARY.md',
  ]
  for (const file of requiredFiles) {
    if (!exists(root, file)) errors.push(`Missing required evidence file: ${file}`)
  }
}

function verifyDimensions(root: string, errors: string[]) {
  const dimensions =
    loadRepoJson<ExperienceDimensionsFile>(
      root,
      'src/content/experience/experience-dimensions.json',
    ).dimensions ?? []
  const motifs = new Set<string>()
  for (const dimension of dimensions) {
    verifyDimensionDocument(root, dimension, errors)
    addDimensionMotifs(dimension, motifs)
  }
  return motifs
}

function verifyDimensionDocument(
  root: string,
  dimension: ExperienceDimensionDef,
  errors: string[],
) {
  const doc = dimension.rationale_doc
  if (!doc) errors.push(`Dimension "${dimension.id}" missing rationale_doc`)
  else if (!exists(root, doc))
    errors.push(`Dimension "${dimension.id}" rationale_doc not found: ${doc}`)
}

function addDimensionMotifs(dimension: ExperienceDimensionDef, motifs: Set<string>) {
  for (const node of dimension.motif_summary?.video_nodes ?? []) motifs.add(String(node))
  for (const node of dimension.motif_summary?.audio_nodes ?? []) motifs.add(String(node))
}

function verifyMappingDocuments(root: string, errors: string[]) {
  const mapping =
    loadRepoJson<DimensionToSignalMappingFile>(
      root,
      'src/content/experience/dimension-to-signal-mapping.json',
    ).mapping ?? {}
  for (const [dimensionId, entry] of Object.entries(mapping)) {
    if (entry?.rationale_doc && !exists(root, entry.rationale_doc)) {
      errors.push(`Mapping "${dimensionId}" rationale_doc not found: ${entry.rationale_doc}`)
    }
  }
}

function verifyMotifClaims(root: string, errors: string[]) {
  const claimsPath = path.join(root, 'docs/references/MOTIF_CLAIMS.json')
  if (!fs.existsSync(claimsPath)) {
    errors.push('Missing motif claims file: docs/references/MOTIF_CLAIMS.json')
    return
  }
  // Loaded outside the try, so a dimensions error is not reported as invalid claims JSON.
  const motifsByDimension = new Map<string, Set<string>>()
  for (const dimension of loadDimensions(root)) {
    const motifs = new Set<string>()
    addDimensionMotifs(dimension, motifs)
    motifsByDimension.set(dimension.id, motifs)
  }
  try {
    const data = loadRepoJson<MotifClaimsFile>(root, 'docs/references/MOTIF_CLAIMS.json')
    for (const claim of data.claims ?? []) {
      verifyClaimTarget(claim, motifsByDimension, errors)
      verifyClaimSources(root, claim, errors)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`Invalid JSON in docs/references/MOTIF_CLAIMS.json: ${message}`)
  }
}

const CLAIM_LABELS: ReadonlySet<string> = new Set<MotifClaimLabel>([
  'supported',
  'mixed',
  'artistic',
  'hypothesis',
])

/** A mistyped label would render as "Hypothesis"; an unknown pair would never be shown. */
function verifyClaimTarget(
  claim: MotifClaim,
  motifsByDimension: Map<string, Set<string>>,
  errors: string[],
) {
  const key = `${claim.dimensionId}|${claim.motif}`
  if (!CLAIM_LABELS.has(claim.label))
    errors.push(`Motif claim (${key}) has unknown label: ${String(claim.label)}`)
  const motifs = motifsByDimension.get(claim.dimensionId)
  if (!motifs) errors.push(`Motif claim (${key}) names an unknown dimension`)
  else if (!motifs.has(claim.motif))
    errors.push(`Motif claim (${key}) names a motif the dimension does not use`)
}

function verifyClaimSources(root: string, claim: MotifClaim, errors: string[]) {
  for (const source of claim.sources ?? []) {
    if (!exists(root, source))
      errors.push(`Motif claim source missing (${claim.dimensionId}|${claim.motif}): ${source}`)
  }
}

function verifyProfilePages(root: string, errors: string[]) {
  const profilesDir = path.join(root, 'src/content/experience/profiles')
  for (const file of fs
    .readdirSync(profilesDir)
    .filter((candidate) => candidate.endsWith('.json'))) {
    const profile = loadRepoJson<Profile>(root, `src/content/experience/profiles/${file}`)
    const doc = `docs/references/conditions/${profile.id}.md`
    if (!exists(root, doc))
      errors.push(`Condition "${profile.id}" missing evidence summary page: ${doc}`)
  }
}

function verifyMotifPages(root: string, motifs: Set<string>, errors: string[]) {
  for (const motif of motifs) {
    const doc = `docs/references/motifs/${motif}.md`
    if (!exists(root, doc)) errors.push(`Motif "${motif}" missing evidence page: ${doc}`)
  }
}

function verifyGeneratedPages(root: string, errors: string[]) {
  const stale: string[] = []
  const sourcesByDim = parseCorpusSourcesByDimension(root)
  // The motif pages list these sources; an empty result means the corpus parser broke.
  if (sourcesByDim.size === 0) errors.push('No DOI sources were extracted from the research corpus')
  writeEvidencePages({
    root,
    stale,
    dimensions: loadDimensions(root).slice(),
    profiles: loadProfiles(root),
    matrixByDim: parseEvidenceMatrix(root),
    claimsByKey: parseMotifClaims(root),
    sourcesByDim,
  })
  for (const file of stale) {
    errors.push(
      `Evidence page is stale: ${path.relative(root, file)}. Regenerate with npm run evidence:gen.`,
    )
  }
}

function verifyMappingSummary(root: string, errors: string[]) {
  try {
    checkMappingSummary(root)
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }
}

function main() {
  const root = process.cwd()
  const errors: string[] = []
  verifyRequiredFiles(root, errors)
  const motifs = verifyDimensions(root, errors)
  verifyMappingDocuments(root, errors)
  verifyMotifClaims(root, errors)
  verifyProfilePages(root, errors)
  verifyMotifPages(root, motifs, errors)
  verifyGeneratedPages(root, errors)
  verifyMappingSummary(root, errors)

  if (errors.length) {
    console.error('[evidence-verify] FAIL')
    for (const e of errors) console.error(`- ${e}`)
    process.exit(1)
  }

  console.log('[evidence-verify] OK')
}

try {
  main()
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e)
  console.error('[evidence-verify] ERROR', msg)
  process.exit(1)
}
