/**
 * Validate composed profiles and safety ranges.
 *
 * Node/tsx compatible (no Vite `?raw` / import.meta.glob).
 *
 * Verifies:
 * - composing selected presets/dimensions produces a Profile-shaped object
 * - deterministic output for same inputs
 * - no NaNs / infinities in numeric params
 * - no missing nodes/presets are reported for chosen test cases
 */

import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { profileSchema, type Profile } from '../../src/domain/experience/schema'
import type {
  DimensionSignalMappingEntry,
  ExperienceDimensionDef,
} from '../../src/domain/experience/composition/types'
import { loadRepoJson } from '../docs/repoJson'
import { validateComposerCase, type ComposerSettings } from './support/composition'

type Failures = { count: number }

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')

async function loadPresetProfile(profileId: string): Promise<Profile | null> {
  try {
    const raw = loadRepoJson<unknown>(ROOT, `src/content/experience/profiles/${profileId}.json`)
    const parsed = profileSchema.safeParse(raw)
    return parsed.success ? (parsed.data as Profile) : null
  } catch {
    return null
  }
}

const dimensionMappingFile = loadRepoJson<{
  mapping: Record<string, DimensionSignalMappingEntry>
}>(ROOT, 'src/content/experience/dimension-to-signal-mapping.json')
const experienceDimsFile = loadRepoJson<{
  dimensions: ExperienceDimensionDef[]
}>(ROOT, 'src/content/experience/experience-dimensions.json')

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
