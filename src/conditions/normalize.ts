import type { Profile } from './schema'
import { GLOBAL_SAFETY_CLAMPS } from './ssotClamps'

export interface SafetyContext {
  global: Record<string, unknown>
  /** Profile-specific clamps used when safeMode is enabled. */
  safeMode: Record<string, unknown>
}

export function getSafetyContext(profile: Profile | null | undefined): SafetyContext {
  const safeMode =
    (profile as { safety?: { safe_mode_clamps?: Record<string, unknown> } })?.safety
      ?.safe_mode_clamps ?? {}
  // Expose as Records so the engine layer can consume without depending on condition-layer types.
  return { global: GLOBAL_SAFETY_CLAMPS as unknown as Record<string, unknown>, safeMode }
}

export function getReducedMotionDisableNodes(profile: Profile | null | undefined): Set<string> {
  const list =
    (profile as { safety?: { reduced_motion_policy?: { disable_nodes?: string[] } } })
      ?.safety?.reduced_motion_policy?.disable_nodes ?? []
  return new Set(list.map((s) => String(s).toLowerCase()))
}

export function clampIntensity(
  profile: Profile,
  intensity: number,
  safeMode: boolean
): number {
  const i0 = Number.isFinite(intensity) ? intensity : 0
  const safety = (profile as { safety?: { intensity_max?: number; safe_mode_clamps?: { max_intensity?: number } } })
    .safety
  const maxByProfile =
    typeof safety?.intensity_max === 'number' ? safety.intensity_max : 1
  const maxBySafeMode =
    safeMode && typeof safety?.safe_mode_clamps?.max_intensity === 'number'
      ? safety.safe_mode_clamps.max_intensity
      : 1
  const max = Math.min(1, maxByProfile, maxBySafeMode)
  return Math.max(0, Math.min(max, i0))
}

