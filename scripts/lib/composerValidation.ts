import { profileSchema, type Profile } from '../../src/conditions/schema'
import {
  composeEffectiveProfileCore,
  type DimensionSignalMappingEntry,
  type ExperienceDimensionDef,
} from '../../src/composer/composeCore'

export type ComposerSettings = {
  intensity: number
  safeMode: boolean
  reducedMotion: boolean
  audioEnabled: boolean
  micEnabled: boolean
  couplingStrength: number
  maxFeedback: number
  interactionAmount: number
  debugOverlay: boolean
}
type Selection = { profileId: string; weight: number }
type DimensionSelection = { dimensionId: string; weight: number }
type Dependencies = {
  loadPresetProfile(profileId: string): Promise<Profile | null>
  getDimensionMappingEntry(dimensionId: string): DimensionSignalMappingEntry | null
  getExperienceDimensions(): ExperienceDimensionDef[]
}

export async function validateComposerCase(
  name: string,
  presets: Selection[],
  dims: DimensionSelection[],
  settings: ComposerSettings,
  dependencies: Dependencies,
  failures: { count: number },
): Promise<void> {
  const a = await composeEffectiveProfileCore(presets, dims, settings, dependencies)
  const b = await composeEffectiveProfileCore(presets, dims, settings, dependencies)
  validateProfile(name, a, failures)
  validateReports(name, a, failures)
  validateDeterminism(name, a.profile, b.profile, failures)
  validateFiniteValues(name, a.profile, failures)
}

function validateProfile(
  name: string,
  result: Awaited<ReturnType<typeof composeEffectiveProfileCore>>,
  failures: { count: number },
) {
  if (!profileSchema.safeParse(result.profile).success)
    reportFailure(failures, `${name}: composed profile failed schema validation`)
}

function validateReports(
  name: string,
  result: Awaited<ReturnType<typeof composeEffectiveProfileCore>>,
  failures: { count: number },
) {
  if (result.report.missingNodes.video.length || result.report.missingNodes.audio.length)
    reportFailure(
      failures,
      `${name}: missing nodes reported (video=${result.report.missingNodes.video.join(',') || 'none'}; audio=${result.report.missingNodes.audio.join(',') || 'none'})`,
    )
  if (result.report.missingPresets.length)
    reportFailure(
      failures,
      `${name}: missing presets reported: ${result.report.missingPresets.join(', ')}`,
    )
}

function validateDeterminism(name: string, a: unknown, b: unknown, failures: { count: number }) {
  if (JSON.stringify(a) !== JSON.stringify(b))
    reportFailure(failures, `${name}: nondeterministic output (same inputs differ)`)
}

function validateFiniteValues(name: string, profile: Profile, failures: { count: number }) {
  assertFiniteNumbers(profile.video_stack, failures, `${name}.video_stack`)
  assertFiniteNumbers(profile.audio_stack, failures, `${name}.audio_stack`)
  assertFiniteNumbers(profile.reactive, failures, `${name}.reactive`)
}

function assertFiniteNumbers(value: unknown, failures: { count: number }, path: string): void {
  if (value == null) return
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      reportFailure(failures, `non-finite number at ${path}: ${String(value)}`)
    return
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++)
      assertFiniteNumbers(value[index], failures, `${path}[${index}]`)
    return
  }
  if (typeof value === 'object')
    for (const [key, nested] of Object.entries(value as Record<string, unknown>))
      assertFiniteNumbers(nested, failures, `${path}.${key}`)
}

function reportFailure(failures: { count: number }, message: string): void {
  console.error(`[composer-validate] ${message}`)
  failures.count++
}
