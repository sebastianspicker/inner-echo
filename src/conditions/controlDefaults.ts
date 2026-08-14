import type { BuildVideoNodesOptions } from './graphBuilder'
import { addBuiltNodeDefaults } from './controlDefaultBuilder'
import { resolveControl } from './controlResolution'
import type { Profile } from './schema'

function defaultGlobalControls(profile: Profile): Record<string, number | boolean> {
  const safety = profile.safety
  return {
    intensity: typeof safety?.intensity_default === 'number' ? safety.intensity_default : 0.5,
    safeMode: false,
    reducedMotion: false,
    audioEnabled: false,
  }
}

function applyControlDefaults(
  out: Record<string, number | boolean>,
  profile: Profile,
  options?: BuildVideoNodesOptions,
): void {
  const controls = profile.ui?.controls ?? []
  for (const control of controls) {
    const resolved = resolveControl(control, profile, options)
    if (resolved) out[resolved.paramKey] = resolved.defaultValue
  }
}

/** Build initial control values from profile (intensity, safeMode, node params). */
export function getDefaultControlValues(
  profile: Profile,
  options?: BuildVideoNodesOptions,
): Record<string, number | boolean> {
  const out = defaultGlobalControls(profile)
  addBuiltNodeDefaults({ out, profile, options })
  applyControlDefaults(out, profile, options)
  return out
}
