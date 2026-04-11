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

function loadJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse JSON at ${path}: ${msg}`)
  }
}

function requireDoc(pathFromRepoRoot: string, failures: { count: number }): void {
  const diskPath = join(ROOT, pathFromRepoRoot)
  if (!existsSync(diskPath)) {
    console.error(`[conditions-validate] missing referenced doc: ${pathFromRepoRoot}`)
    failures.count++
  }
}

function main(): void {
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

  for (const f of files) {
    const path = join(PROFILES_DIR, f)
    const raw = loadJson(path)
    const parsed = profileSchema.safeParse(raw)
    if (!parsed.success) {
      console.error(`[conditions-validate] profile schema failed: ${f}`, parsed.error.flatten())
      failures.count++
      continue
    }

    const profile: Profile = parsed.data
    if (!ids.has(profile.id)) {
      console.error(`[conditions-validate] profile not in catalog: ${profile.id}`)
      failures.count++
    }

    // referenced docs per profile
    for (const p of profile.references?.dimensions ?? []) {
      requireDoc(p, failures)
    }

    const nodes = buildVideoNodes(profile, { reducedMotion: false })
    const expectedVideoCount = profile.video_stack.length
    if (nodes.length !== expectedVideoCount) {
      console.error(
        `[conditions-validate] video graph mismatch for ${profile.id}: built ${nodes.length} of ${expectedVideoCount}. (Unknown node?)`,
      )
      failures.count++
    }

    const reactive = profile.reactive?.analyser_to_params ?? []
    for (const m of reactive) {
      const resolved = resolveAnalyserTarget(m.target, profile, { reducedMotion: false })
      if (!resolved) {
        console.error(
          `[conditions-validate] reactive target did not resolve for ${profile.id}: ${m.target}`,
        )
        failures.count++
      }
    }
  }

  if (failures.count > 0) {
    console.error(`[conditions-validate] FAIL (${failures.count} issue(s))`)
    process.exit(1)
  }
  console.log(`[conditions-validate] OK (${files.length} profiles)`)
}

main()
