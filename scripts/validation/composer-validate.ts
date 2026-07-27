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
import { profileSchema, type Profile } from '../../src/conditions/schema'
import {
  type DimensionSignalMappingEntry,
  type ExperienceDimensionDef,
} from '../../src/composer/composeCore'
import { parseFirstJsonObject } from '../../src/utils/jsonObjectParser'
import { validateComposerCase, type ComposerSettings } from '../lib/composerValidation'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')

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

function getDimensionMappingEntry(dimensionId: string): DimensionSignalMappingEntry | null {
  return dimensionMappingFile.mapping?.[dimensionId] ?? null
}

function getExperienceDimensions() {
  return Array.isArray(experienceDimsFile.dimensions) ? experienceDimsFile.dimensions.slice() : []
}

async function main(): Promise<void> {
  const f: Failures = { count: 0 }

  const baseSettings: ComposerSettings = {
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

  const dependencies = { loadPresetProfile, getDimensionMappingEntry, getExperienceDimensions }
  await validateComposerCase(
    'preset:anxiety+panic',
    [
      { profileId: 'anxiety', weight: 0.7 },
      { profileId: 'panic', weight: 0.5 },
    ],
    [],
    baseSettings,
    dependencies,
    f,
  )

  await validateComposerCase(
    'symptom:hyperarousal+rumination_loop',
    [],
    [
      { dimensionId: 'hyperarousal', weight: 0.8 },
      { dimensionId: 'rumination_loop', weight: 0.6 },
    ],
    baseSettings,
    dependencies,
    f,
  )

  await validateComposerCase(
    'hybrid:adhd+preset + sensory_overload dimension',
    [{ profileId: 'adhd', weight: 0.8 }],
    [{ dimensionId: 'sensory_overload', weight: 0.5 }],
    baseSettings,
    dependencies,
    f,
  )

  if (f.count > 0) {
    console.error(`[composer-validate] FAIL (${f.count} issue(s))`)
    process.exit(1)
  }
  console.log('[composer-validate] OK')
}

void main()
