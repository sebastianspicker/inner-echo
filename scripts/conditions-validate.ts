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
import { catalogSchema, profileSchema, type Profile } from '../src/conditions/schema'
import { buildVideoNodes } from '../src/conditions/graphBuilder'
import { resolveAnalyserTarget } from '../src/engine/reactive'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CONDITIONS_DIR = join(ROOT, 'src', 'conditions')
const CATALOG_PATH = join(CONDITIONS_DIR, 'catalog.json')
const PROFILES_DIR = join(CONDITIONS_DIR, 'profiles')

const requireDoc = (pathFromRepoRoot: string, failures: { count: number }): void => {
  const diskPath = join(ROOT, pathFromRepoRoot)
  if (!existsSync(diskPath)) {
    console.error(`[conditions-validate] missing referenced doc: ${pathFromRepoRoot}`)
    failures.count++
  }
}

const validateCatalogReferences = (
  references: { dimensions_index?: string; evidence_matrix?: string } | undefined,
  failures: { count: number },
): void => {
  if (references?.dimensions_index) requireDoc(references.dimensions_index, failures)
  if (references?.evidence_matrix) requireDoc(references.evidence_matrix, failures)
}

const validateProfile = (
  profile: Profile,
  catalogIds: Set<string>,
  failures: { count: number },
): void => {
  if (!catalogIds.has(profile.id)) {
    console.error(`[conditions-validate] profile not in catalog: ${profile.id}`)
    failures.count++
  }
  for (const reference of profile.references?.dimensions ?? []) requireDoc(reference, failures)

  const nodes = buildVideoNodes(profile, { reducedMotion: false })
  const expectedVideoCount = profile.video_stack.length
  if (nodes.length !== expectedVideoCount) {
    console.error(
      `[conditions-validate] video graph mismatch for ${profile.id}: built ${nodes.length} of ${expectedVideoCount}. (Unknown node?)`,
    )
    failures.count++
  }
  for (const mapping of profile.reactive?.analyser_to_params ?? []) {
    if (resolveAnalyserTarget(mapping.target, profile, { reducedMotion: false })) continue
    console.error(
      `[conditions-validate] reactive target did not resolve for ${profile.id}: ${mapping.target}`,
    )
    failures.count++
  }
}

const validateProfileFile = (
  file: string,
  catalogIds: Set<string>,
  failures: { count: number },
): void => {
  const raw = loadJson(join(PROFILES_DIR, file))
  const parsed = profileSchema.safeParse(raw)
  if (!parsed.success) {
    console.error('[conditions-validate] profile schema failed: %s', file, parsed.error.flatten())
    failures.count++
    return
  }
  validateProfile(parsed.data, catalogIds, failures)
}

const main = (): void => {
  const catalogRaw = loadJson(CATALOG_PATH)
  const catalogParsed = catalogSchema.safeParse(catalogRaw)
  if (!catalogParsed.success) {
    console.error('[conditions-validate] catalog validation failed:', catalogParsed.error.flatten())
    process.exit(1)
  }

  const failures = { count: 0 }
  validateCatalogReferences(catalogParsed.data.references, failures)

  const files = readdirSync(PROFILES_DIR).filter((f) => f.endsWith('.json'))
  const ids = new Set(catalogParsed.data.conditions.map((c) => c.id))

  for (const file of files) validateProfileFile(file, ids, failures)

  if (failures.count > 0) {
    console.error(`[conditions-validate] FAIL (${failures.count} issue(s))`)
    process.exit(1)
  }
  console.log(`[conditions-validate] OK (${files.length} profiles)`)
}

const loadJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse JSON at ${path}: ${msg}`)
  }
}

main()
