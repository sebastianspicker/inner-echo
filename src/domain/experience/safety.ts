/**
 * Profile Normalization Utilities
 *
 * This module provides helper functions to safely extract and normalize configuration
 * values from an experience profile, particularly related to safety and accessibility.
 * It ensures media runtimes receive guaranteed clamped values (preventing crashes
 * or unsafe strobe effects) even if a profile JSON is authored incorrectly.
 */

import type { Profile } from './schema'
import { GLOBAL_SAFETY_CLAMPS } from './safetyLimits'
import { clamp } from '../../shared/numbers'

export interface SafetyContext {
  global: Record<string, unknown>
  /** Profile-specific clamps used when safeMode is enabled. */
  safeMode: Record<string, unknown>
}

export function getSafetyContext(profile: Profile | null | undefined): SafetyContext {
  const safeMode = profile?.safety?.safe_mode_clamps ?? {}
  // Expose as Records so runtime adapters consume a stable, implementation-neutral shape.
  // Spread converts the fixed-shape GlobalSafetyClamps into a plain Record<string, unknown>.
  return { global: { ...GLOBAL_SAFETY_CLAMPS }, safeMode }
}

export function getReducedMotionDisableNodes(profile: Profile | null | undefined): Set<string> {
  const list = profile?.safety?.reduced_motion_policy?.disable_nodes ?? []
  return new Set(list.map((s) => String(s).toLowerCase()))
}

/**
 * Exponent of the perceptual slider curve. Effect magnitudes (blur radius, desaturation, dimming,
 * mix levels, modulation depth) read compressively, so a linear slider spends most of its travel
 * on barely visible change. The square root keeps 0 at nothing and 1 at the authored value while
 * giving the lower half of the slider a visible share of the effect.
 */
export const INTENSITY_CURVE_EXPONENT = 0.5

function resolveIntensityParts(
  profile: Profile,
  intensity: number,
  safeMode: boolean,
): { capped: number; share: number } {
  const i0 = Number.isFinite(intensity) ? intensity : 0
  const safety = profile.safety
  const maxByProfile = typeof safety?.intensity_max === 'number' ? safety.intensity_max : 1
  const capped = clamp(i0, 0, Math.min(1, maxByProfile))
  const safeModeMax = safety?.safe_mode_clamps?.max_intensity
  const share = safeMode && typeof safeModeMax === 'number' ? clamp(safeModeMax, 0, 1) : 1
  return { capped, share }
}

/**
 * Clamped (linear) intensity for a profile. The profile's `intensity_max` caps the slider; Safe
 * Mode then damps proportionally by `max_intensity` so the whole slider keeps meaning instead of
 * silently flattening its top end.
 */
export function clampIntensity(profile: Profile, intensity: number, safeMode: boolean): number {
  const { capped, share } = resolveIntensityParts(profile, intensity, safeMode)
  return capped * share
}

/**
 * The intensity the engines receive: the clamped slider value mapped through the perceptual
 * curve, then damped by the Safe Mode share. Full slider travel without Safe Mode still equals
 * the authored profile values, so every clamp that bounds the authored state keeps holding.
 */
export function effectiveIntensity(profile: Profile, intensity: number, safeMode: boolean): number {
  const { capped, share } = resolveIntensityParts(profile, intensity, safeMode)
  return capped ** INTENSITY_CURVE_EXPONENT * share
}

export interface AppliedClampSnapshot {
  intensityInput: number
  /** Linear clamp only (slider cap and Safe Mode share). */
  intensityClamped: number
  /** What the video and audio engines receive after the perceptual curve. */
  intensityEffective: number
  safeMode: boolean
  reducedMotion: boolean
  safeModeClampKeys: string[]
  reducedMotionDisabledNodes: string[]
}

/** Pure summary of the clamps a profile currently applies, for debug display only. */
export function describeAppliedClamps(
  profile: Profile | null,
  intensity: number,
  safeMode: boolean,
  reducedMotion: boolean,
): AppliedClampSnapshot | undefined {
  if (!profile) return undefined
  const intensityClamped = clampIntensity(profile, intensity, safeMode)
  const intensityEffective = effectiveIntensity(profile, intensity, safeMode)
  const safeModeClampKeys = Object.keys(profile.safety.safe_mode_clamps ?? {}).sort((a, b) =>
    a.localeCompare(b),
  )
  const reducedMotionDisabledNodes = Array.from(getReducedMotionDisableNodes(profile)).sort(
    (a, b) => a.localeCompare(b),
  )
  return {
    intensityInput: intensity,
    intensityClamped,
    intensityEffective,
    safeMode,
    reducedMotion,
    safeModeClampKeys,
    reducedMotionDisabledNodes,
  }
}
