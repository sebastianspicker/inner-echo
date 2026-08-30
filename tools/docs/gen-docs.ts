/**
 * Derives docs/generated/conditions-catalog.md and preset-schema (JSON + MD).
 * Run: npm run docs:gen
 *
 * Do not edit generated files by hand.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { z, toJSONSchema } from 'zod'
import { profileSchema, catalogSchema } from '../../src/domain/experience/schema.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')

const GENERATED_DIR = join(ROOT, 'docs', 'generated')
const CHECK_ONLY = process.argv.includes('--check')
// Canonical source for condition data
const CONDITIONS_DIR = join(ROOT, 'src', 'content', 'experience')
const CATALOG_PATH = join(CONDITIONS_DIR, 'catalog.json')
const PROFILES_DIR = join(CONDITIONS_DIR, 'profiles')

const DO_NOT_EDIT =
  '<!-- Source: tools/docs/gen-docs.ts. Edit the source contracts, then run npm run docs:gen. -->'

function writeOrVerifyGenerated(filename: string, contents: string): void {
  const outputPath = join(GENERATED_DIR, filename)
  if (CHECK_ONLY) {
    const current = readFileSync(outputPath, 'utf-8')
    if (current !== contents) {
      throw new Error(
        `${outputPath} is stale. Regenerate tracked documentation with npm run docs:gen.`,
      )
    }
    return
  }
  writeFileSync(outputPath, contents, 'utf-8')
}

type Catalog = z.infer<typeof catalogSchema>
type Profile = z.infer<typeof profileSchema>

function loadCatalog() {
  const raw = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'))
  const parsed = catalogSchema.safeParse(raw)
  if (!parsed.success)
    throw new Error(`Catalog validation failed: ${JSON.stringify(parsed.error.flatten())}`)
  return parsed.data
}

function loadProfiles() {
  const files = readdirSync(PROFILES_DIR).filter((f) => f.endsWith('.json'))
  const profiles: Profile[] = []
  for (const f of files) {
    const path = join(PROFILES_DIR, f)
    const raw = JSON.parse(readFileSync(path, 'utf-8'))
    const parsed = profileSchema.safeParse(raw)
    if (!parsed.success) {
      console.warn(`[gen-docs] Skip ${f}: validation failed`)
      continue
    }
    profiles.push(parsed.data)
  }
  return profiles.sort((a, b) => a.id.localeCompare(b.id))
}

function videoNodeNames(p: Profile) {
  return (p.video_stack ?? []).map((n) => n.node).filter(Boolean)
}

function audioNodeNames(p: Profile) {
  const chain = p.audio_stack?.chain
  if (!chain) return []
  return chain.map((n) => n.node).filter(Boolean)
}

function allNodeNames(p: Profile) {
  const v = videoNodeNames(p)
  const a = audioNodeNames(p)
  return [...new Set([...v, ...a])].sort()
}

function appendCatalogTableRow(
  lines: string[],
  profile: Profile,
  catalogById: Map<string, Catalog['conditions'][number]>,
) {
  const entry = catalogById.get(profile.id)
  const tags = entry?.tags?.length ? entry.tags.join(', ') : '-'
  const intensityMax = profile.safety?.intensity_max ?? '-'
  const nodes = allNodeNames(profile).join(', ') || '-'
  const label = profile.label.replace(/\|/g, '\\|')
  lines.push(`| ${profile.id} | ${label} | ${tags} | ${intensityMax} | ${nodes} |`)
}

function appendConditionDetails(
  lines: string[],
  profile: Profile,
  catalogById: Map<string, Catalog['conditions'][number]>,
) {
  const entry = catalogById.get(profile.id)
  const description = entry?.description ?? profile.summary ?? ''
  lines.push(`### ${profile.label} (\`${profile.id}\`)`, '')
  appendDescription(lines, description)
  appendWarnings(lines, profile.safety?.warnings ?? [])
  lines.push(`Nodes: ${allNodeNames(profile).join(', ') || 'none'}`, '')
}

function appendDescription(lines: string[], description: string) {
  if (description) lines.push(description, '')
}

function appendWarnings(lines: string[], warnings: string[]) {
  if (warnings.length > 0)
    lines.push('Warnings:', '', ...warnings.map((warning) => `- ${warning}`), '')
}

function generateConditionsCatalogMd(catalog: Catalog, profiles: Profile[]) {
  const catalogById = new Map(catalog.conditions.map((c) => [c.id, c]))
  const lines: string[] = [
    '# Conditions catalog',
    '',
    DO_NOT_EDIT,
    '',
    'Summary of all conditions and their profiles (id, label, tags, safety, nodes).',
    '',
    '## Table',
    '',
    '| id | label | tags | safety (intensity max) | nodes |',
    '|----|-------|------|------------------------|-------|',
  ]

  for (const profile of profiles) appendCatalogTableRow(lines, profile, catalogById)

  lines.push('')
  lines.push('## Per-condition details')
  lines.push('')

  for (const profile of profiles) appendConditionDetails(lines, profile, catalogById)

  return lines.join('\n')
}

function generatePresetSchemaJson() {
  const jsonSchema = toJSONSchema(profileSchema, {
    target: 'draft-07',
    unrepresentable: 'any',
  }) as Record<string, unknown>
  jsonSchema.$comment =
    'Source: tools/docs/gen-docs.ts. Edit the source contracts, then run npm run docs:gen.'
  return JSON.stringify(jsonSchema, null, 2)
}

function generatePresetSchemaMd(schemaJson: string) {
  const required = [
    'id',
    'label',
    'summary',
    'framing',
    'experience_dimensions',
    'safety',
    'video_stack',
  ]
  const lines: string[] = [
    '# Preset profile JSON Schema',
    '',
    DO_NOT_EDIT,
    '',
    'This document describes the JSON Schema for experience profile files under `src/content/experience/profiles/<id>.json`.',
    '',
    '## Required keys',
    '',
    'The schema requires the following keys:',
    '',
    ...required.map((k) => `- \`${k}\``),
    '',
    '| Key | Meaning |',
    '|-----|--------|',
    '| `id` | Condition identifier (must match catalog and filename). |',
    '| `label` | Human-readable name shown in the UI. |',
    '| `summary` | One-paragraph, non-diagnostic description. |',
    '| `framing` | Metaphor framing block (non-diagnostic). |',
    '| `experience_dimensions` | Dimension references + weights. |',
    '| `safety` | Safety defaults, clamps, warnings, Reduced Motion policy. |',
    '| `video_stack` | Ordered array of video node definitions (can be empty). |',
    '',
    'Other important keys: `safety` (intensity_default, intensity_max, warnings), `audio_stack`, `ui.controls`, `reactive.analyser_to_params`.',
    '',
    '## JSON Schema',
    '',
    'The machine-readable JSON Schema is embedded below and also written to `preset-schema.json`.',
    '',
    '```json',
    schemaJson,
    '```',
    '',
  ]
  return lines.join('\n')
}

function main() {
  mkdirSync(GENERATED_DIR, { recursive: true })

  const catalog = loadCatalog()
  const profiles = loadProfiles()

  const conditionsCatalogMd = generateConditionsCatalogMd(catalog, profiles)
  writeOrVerifyGenerated('conditions-catalog.md', conditionsCatalogMd)

  const schemaJson = generatePresetSchemaJson()
  writeOrVerifyGenerated('preset-schema.json', schemaJson)

  const presetSchemaMd = generatePresetSchemaMd(schemaJson)
  writeOrVerifyGenerated('preset-schema.md', presetSchemaMd)

  console.log(
    CHECK_ONLY
      ? '[docs:verify] Generated documentation is current.'
      : '[docs:gen] Written docs/generated catalog and schema files.',
  )
}

main()
