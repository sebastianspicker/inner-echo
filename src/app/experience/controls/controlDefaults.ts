import type { BuildVideoNodesOptions } from '../../../domain/experience/videoStack'
import { addBuiltNodeDefaults, resolveVideoStackOptions } from './controlDefaultBuilder'
import { resolveControl } from './controlResolution'
import type { Profile } from '../../../domain/experience/schema'

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
  options?: Partial<BuildVideoNodesOptions>,
): void {
  const controls = profile.ui?.controls ?? []
  const resolvedOptions = resolveVideoStackOptions(options)
  for (const control of controls) {
    const resolved = resolveControl(control, profile, resolvedOptions)
    if (resolved) out[resolved.paramKey] = resolved.defaultValue
  }
}

/** Build initial control values from profile (intensity, safeMode, node params). */
export function getDefaultControlValues(
  profile: Profile,
  options?: Partial<BuildVideoNodesOptions>,
): Record<string, number | boolean> {
  const out = defaultGlobalControls(profile)
  addBuiltNodeDefaults({ out, profile, options })
  applyControlDefaults(out, profile, options)
  return out
}
