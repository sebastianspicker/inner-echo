/**
 * Composer validation script (Step 7-lite).
 *
 * Node/tsx compatible (no Vite `?raw` / import.meta.glob).
 *
 * Verifies:
 * - composing selected presets/dimensions produces a Profile-shaped object
 * - deterministic output for same inputs
 * - no NaNs / infinities in numeric params
 * - no missing nodes/presets are reported for chosen test cases
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { profileSchema, type Profile } from '../src/conditions/schema'
import {
  composeEffectiveProfileCore,
  type DimensionSignalMappingEntry,
  type ExperienceDimensionDef,
} from '../src/composer/composeCore'
import { parseFirstJsonObject } from '../src/utils/jsonObjectParser'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function loadText(pathFromRoot: string): string {
  return readFileSync(join(ROOT, pathFromRoot), 'utf-8')
}

async function loadPresetProfile(profileId: string): Promise<Profile | null> {
  try {
    const raw = JSON.parse(loadText(`src/conditions/profiles/${profileId}.json`))
    const parsed = profileSchema.safeParse(raw)
    return parsed.success ? (parsed.data as Profile) : null
  } catch {
    return null
  }
}

const dimensionMappingFile = parseFirstJsonObject<{
  mapping: Record<string, DimensionSignalMappingEntry>
}>(loadText('src/conditions/dimension-to-signal-mapping.json'), {
  predicate(value) {
    const mapping = (value as { mapping?: unknown }).mapping
    return mapping != null && typeof mapping === 'object' && !Array.isArray(mapping)
  },
})
const experienceDimsFile = parseFirstJsonObject<{
  dimensions: ExperienceDimensionDef[]
}>(loadText('src/conditions/experience-dimensions.json'), {
  predicate(value) {
    const dimensions = (value as { dimensions?: unknown }).dimensions
    return Array.isArray(dimensions)
  },
})

function getDimensionMappingEntry(
  dimensionId: string
): DimensionSignalMappingEntry | null {
  return dimensionMappingFile.mapping?.[dimensionId] ?? null
}

function getExperienceDimensions() {
  return Array.isArray(experienceDimsFile.dimensions) ? experienceDimsFile.dimensions.slice() : []
}

type Failures = { count: number }

function fail(f: Failures, msg: string): void {
  console.error(`[composer-validate] ${msg}`)
  f.count++
}

function assertFiniteNumbers(obj: unknown, f: Failures, path: string): void {
  if (obj == null) return
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) fail(f, `non-finite number at ${path}: ${String(obj)}`)
    return
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) assertFiniteNumbers(obj[i], f, `${path}[${i}]`)
    return
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      assertFiniteNumbers(v, f, `${path}.${k}`)
    }
  }
}

function stableStringify(obj: unknown): string {
  // JSON.stringify is stable enough here because we intentionally create sorted keys in composer stacks.
  return JSON.stringify(obj)
}

async function oneCase(
  name: string,
  presets: Array<{ profileId: string; weight: number }>,
  dims: Array<{ dimensionId: string; weight: number }>,
  settings: {
    intensity: number
    safeMode: boolean
    reducedMotion: boolean
    audioEnabled: boolean
    micEnabled: boolean
    couplingStrength: number
    maxFeedback: number
    interactionAmount: number
    debugOverlay: boolean
  },
  f: Failures
): Promise<void> {
  const a = await composeEffectiveProfileCore(presets, dims, settings, {
    loadPresetProfile,
    getDimensionMappingEntry,
    getExperienceDimensions,
  })
  const b = await composeEffectiveProfileCore(presets, dims, settings, {
    loadPresetProfile,
    getDimensionMappingEntry,
    getExperienceDimensions,
  })

  const parsed = profileSchema.safeParse(a.profile)
  if (!parsed.success) {
    fail(f, `${name}: composed profile failed schema validation`)
  }

  if (a.report.missingNodes.video.length || a.report.missingNodes.audio.length) {
    fail(
      f,
      `${name}: missing nodes reported (video=${a.report.missingNodes.video.join(',') || 'none'}; audio=${
        a.report.missingNodes.audio.join(',') || 'none'
      })`
    )
  }
  if (a.report.missingPresets.length) {
    fail(f, `${name}: missing presets reported: ${a.report.missingPresets.join(', ')}`)
  }

  const sa = stableStringify(a.profile)
  const sb = stableStringify(b.profile)
  if (sa !== sb) {
    fail(f, `${name}: nondeterministic output (same inputs differ)`)
  }

  assertFiniteNumbers(a.profile.video_stack, f, `${name}.video_stack`)
  assertFiniteNumbers(a.profile.audio_stack, f, `${name}.audio_stack`)
  assertFiniteNumbers(a.profile.reactive, f, `${name}.reactive`)
}

async function main(): Promise<void> {
  const f: Failures = { count: 0 }

  const baseSettings = {
    intensity: 0.5,
    safeMode: true,
    reducedMotion: true,
    audioEnabled: true,
    micEnabled: false,
    couplingStrength: 0.5,
    maxFeedback: 0.35,
    interactionAmount: 0.15,
    debugOverlay: false,
  }

  await oneCase(
    'preset:anxiety+panic',
    [
      { profileId: 'anxiety', weight: 0.7 },
      { profileId: 'panic', weight: 0.5 },
    ],
    [],
    baseSettings,
    f
  )

  await oneCase(
    'symptom:hyperarousal+rumination_loop',
    [],
    [
      { dimensionId: 'hyperarousal', weight: 0.8 },
      { dimensionId: 'rumination_loop', weight: 0.6 },
    ],
    baseSettings,
    f
  )

  await oneCase(
    'hybrid:adhd+preset + sensory_overload dimension',
    [{ profileId: 'adhd', weight: 0.8 }],
    [{ dimensionId: 'sensory_overload', weight: 0.5 }],
    baseSettings,
    f
  )

  if (f.count > 0) {
    console.error(`[composer-validate] FAIL (${f.count} issue(s))`)
    process.exit(1)
  }
  console.log('[composer-validate] OK')
}

void main()
