/**
 * Build-time verification for evidence traceability.
 *
 * Fails if:
 * - any dimension in `src/conditions/experience-dimensions.json` lacks a rationale_doc or it doesn't exist
 * - any dimension mapping entry declares a rationale_doc that doesn't exist
 * - any condition profile in `src/conditions/profiles/*.json` lacks a corresponding `docs/references/conditions/<id>.md`
 * - canonical evidence IA files are missing
 *
 * IMPORTANT: Does not modify `src/conditions/**` (read-only).
 */

import fs from 'node:fs'
import path from 'node:path'

type ExperienceDimensionDef = { id: string; rationale_doc?: string }
type ExperienceDimensionsFile = { dimensions: ExperienceDimensionDef[] }
type DimensionToSignalMappingFile = { mapping: Record<string, { rationale_doc?: string }> }
type Profile = { id: string }

function parseFirstJsonObject(text: string): unknown {
  const start = text.indexOf('{')
  if (start < 0) throw new Error('No JSON object start found')
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) return JSON.parse(text.slice(start, i + 1))
    }
  }
  throw new Error('Unterminated JSON object')
}

function readJsonFirstObject<T>(filePath: string): T {
  const text = fs.readFileSync(filePath, 'utf-8')
  return parseFirstJsonObject(text) as T
}

function exists(root: string, p: string): boolean {
  return fs.existsSync(path.join(root, p))
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function main(): void {
  const root = process.cwd()
  const errors: string[] = []

  const requiredFiles = [
    'docs/references/README.md',
    'docs/references/INDEX.md',
    'docs/references/EVIDENCE_MATRIX.md',
    'docs/references/CONTRIBUTIONS_AND_LIMITS.md',
    'docs/REFERENCES_AUDIT.md',
  ]
  for (const f of requiredFiles) {
    if (!exists(root, f)) errors.push(`Missing required evidence file: ${f}`)
  }

  const dimsFile = readJsonFirstObject<ExperienceDimensionsFile>(path.join(root, 'src/conditions/experience-dimensions.json'))
  for (const d of dimsFile.dimensions ?? []) {
    const doc = d.rationale_doc
    if (!doc) {
      errors.push(`Dimension "${d.id}" missing rationale_doc`)
      continue
    }
    if (!exists(root, doc)) errors.push(`Dimension "${d.id}" rationale_doc not found: ${doc}`)
  }

  const mapFile = readJsonFirstObject<DimensionToSignalMappingFile>(path.join(root, 'src/conditions/dimension-to-signal-mapping.json'))
  for (const [dimId, entry] of Object.entries(mapFile.mapping ?? {})) {
    if (!entry?.rationale_doc) continue
    if (!exists(root, entry.rationale_doc)) errors.push(`Mapping "${dimId}" rationale_doc not found: ${entry.rationale_doc}`)
  }

  const profilesDir = path.join(root, 'src/conditions/profiles')
  const profileFiles = fs.readdirSync(profilesDir).filter((f) => f.endsWith('.json'))
  for (const file of profileFiles) {
    const prof = readJsonFirstObject<Profile>(path.join(profilesDir, file))
    const doc = `docs/references/conditions/${prof.id}.md`
    if (!exists(root, doc)) errors.push(`Condition "${prof.id}" missing evidence summary page: ${doc}`)
  }

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

