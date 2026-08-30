/**
 * Build-time verification for evidence traceability.
 *
 * Fails if:
 * - any dimension in `src/content/experience/experience-dimensions.json` lacks a rationale_doc or it doesn't exist
 * - any dimension mapping entry declares a rationale_doc that doesn't exist
 * - any experience profile in `src/content/experience/profiles/*.json` lacks a corresponding `docs/references/conditions/<id>.md`
 * - canonical evidence IA files are missing
 *
 * IMPORTANT: Does not modify `src/content/experience/**` (read-only).
 */

import fs from 'node:fs'
import path from 'node:path'
import { parseFirstJsonObject } from '../shared/json/jsonObjectParser'

type ExperienceDimensionDef = {
  id: string
  rationale_doc?: string
  motif_summary?: { video_nodes?: string[]; audio_nodes?: string[] }
}
type ExperienceDimensionsFile = { dimensions: ExperienceDimensionDef[] }
type DimensionToSignalMappingFile = { mapping: Record<string, { rationale_doc?: string }> }
type Profile = { id: string }
type MotifClaimsFile = {
  claims?: Array<{ dimensionId?: string; motif?: string; label?: string; sources?: string[] }>
}

function readJsonFirstObject<T>(filePath: string) {
  const text = fs.readFileSync(filePath, 'utf-8')
  return parseFirstJsonObject(text) as T
}

function exists(root: string, p: string) {
  return fs.existsSync(path.join(root, p))
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
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
    readJsonFirstObject<ExperienceDimensionsFile>(
      path.join(root, 'src/content/experience/experience-dimensions.json'),
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
    readJsonFirstObject<DimensionToSignalMappingFile>(
      path.join(root, 'src/content/experience/dimension-to-signal-mapping.json'),
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
  try {
    const data = JSON.parse(fs.readFileSync(claimsPath, 'utf-8')) as MotifClaimsFile
    for (const claim of data.claims ?? []) verifyClaimSources(root, claim, errors)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`Invalid JSON in docs/references/MOTIF_CLAIMS.json: ${message}`)
  }
}

function verifyClaimSources(
  root: string,
  claim: NonNullable<MotifClaimsFile['claims']>[number],
  errors: string[],
) {
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
    const profile = readJsonFirstObject<Profile>(path.join(profilesDir, file))
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

function main() {
  const root = process.cwd()
  const errors: string[] = []
  verifyRequiredFiles(root, errors)
  const motifs = verifyDimensions(root, errors)
  verifyMappingDocuments(root, errors)
  verifyMotifClaims(root, errors)
  verifyProfilePages(root, errors)
  verifyMotifPages(root, motifs, errors)

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
