/**
 * Conditions validation script (canonical repo paths).
 *
 * Verifies:
 * - `src/conditions/catalog.json` validates against runtime Zod schemas
 * - every `src/conditions/profiles/*.json` validates and is present in catalog
 * - referenced docs exist under `docs/references/**`
 * - video graph can be built (unknown nodes treated as failures here)
 * - reactive mappings resolve (video + audio targets), unknown targets are failures
 *
 * Run: npm run conditions:validate
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { catalogSchema, profileSchema, type Profile } from '../../src/conditions/schema'
import { buildVideoNodes } from '../../src/conditions/graphBuilder'
import { resolveAnalyserTarget } from '../../src/engine/reactive'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')
const CONDITIONS_DIR = join(ROOT, 'src', 'conditions')
const CATALOG_PATH = join(CONDITIONS_DIR, 'catalog.json')
const PROFILES_DIR = join(CONDITIONS_DIR, 'profiles')

function loadJson(path: string) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse JSON at ${path}: ${msg}`)
  }
}

function requireDoc(pathFromRepoRoot: string, failures: { count: number }) {
  const diskPath = join(ROOT, pathFromRepoRoot)
  if (!existsSync(diskPath)) {
    console.error(`[conditions-validate] missing referenced doc: ${pathFromRepoRoot}`)
    failures.count++
  }
}

function validateProfile(file: string, ids: Set<string>, failures: { count: number }) {
  const profilePath = join(PROFILES_DIR, file)
  const parsed = profileSchema.safeParse(loadJson(profilePath))
  if (!parsed.success) {
    console.error(`[conditions-validate] profile schema failed: ${file}`, parsed.error.flatten())
    failures.count++
    return
  }

  const profile: Profile = parsed.data
  validateProfileCatalog(profile, ids, failures)
  for (const docPath of profile.references?.dimensions ?? []) requireDoc(docPath, failures)
  validateProfileGraph(profile, failures)
  validateReactiveMappings(profile, failures)
}

function validateProfileCatalog(profile: Profile, ids: Set<string>, failures: { count: number }) {
  if (!ids.has(profile.id)) {
    console.error(`[conditions-validate] profile not in catalog: ${profile.id}`)
    failures.count++
  }
}

function validateProfileGraph(profile: Profile, failures: { count: number }) {
  const nodes = buildVideoNodes(profile, { reducedMotion: false })
  if (nodes.length !== profile.video_stack.length) {
    console.error(
      `[conditions-validate] video graph mismatch for ${profile.id}: built ${nodes.length} of ${profile.video_stack.length}. (Unknown node?)`,
    )
    failures.count++
  }
}

function validateReactiveMappings(profile: Profile, failures: { count: number }) {
  for (const mapping of profile.reactive?.analyser_to_params ?? []) {
    if (!resolveAnalyserTarget(mapping.target, profile, { reducedMotion: false })) {
      console.error(
        `[conditions-validate] reactive target did not resolve for ${profile.id}: ${mapping.target}`,
      )
      failures.count++
    }
  }
}

function main() {
  const catalogRaw = loadJson(CATALOG_PATH)
  const catalogParsed = catalogSchema.safeParse(catalogRaw)
  if (!catalogParsed.success) {
    console.error('[conditions-validate] catalog validation failed:', catalogParsed.error.flatten())
    process.exit(1)
  }

  const failures = { count: 0 }
  // catalog-level doc references
  const refs = catalogParsed.data.references
  if (refs?.dimensions_index) requireDoc(refs.dimensions_index, failures)
  if (refs?.evidence_matrix) requireDoc(refs.evidence_matrix, failures)

  const files = readdirSync(PROFILES_DIR).filter((f) => f.endsWith('.json'))
  const ids = new Set(catalogParsed.data.conditions.map((c) => c.id))

  for (const file of files) validateProfile(file, ids, failures)

  if (failures.count > 0) {
    console.error(`[conditions-validate] FAIL (${failures.count} issue(s))`)
    process.exit(1)
  }
  console.log(`[conditions-validate] OK (${files.length} profiles)`)
}

main()
