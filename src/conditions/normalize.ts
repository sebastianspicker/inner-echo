/**
 * Profile Normalization Utilities
 * 
 * This module provides helper functions to safely extract and normalize configuration
 * values from a condition profile, particularly related to Safety and Accessibility (A11y).
 * It ensures the WebGL rendering engine has guaranteed clamped values (preventing crashes
 * or unsafe strobe effects) even if a profile JSON is authored incorrectly.
 */

import type { Profile } from './schema'
import { GLOBAL_SAFETY_CLAMPS } from './ssotClamps'
import { clamp } from '../utils/numeric'

export interface SafetyContext {
  global: Record<string, unknown>
  /** Profile-specific clamps used when safeMode is enabled. */
  safeMode: Record<string, unknown>
}

export function getSafetyContext(profile: Profile | null | undefined): SafetyContext {
  const safeMode = profile?.safety?.safe_mode_clamps ?? {}
  // Expose as Records so the engine layer can consume without depending on condition-layer types.
  return { global: GLOBAL_SAFETY_CLAMPS as unknown as Record<string, unknown>, safeMode }
}

export function getReducedMotionDisableNodes(profile: Profile | null | undefined): Set<string> {
  const list = profile?.safety?.reduced_motion_policy?.disable_nodes ?? []
  return new Set(list.map((s) => String(s).toLowerCase()))
}

export function clampIntensity(
  profile: Profile,
  intensity: number,
  safeMode: boolean
): number {
  const i0 = Number.isFinite(intensity) ? intensity : 0
  const safety = profile.safety
  const maxByProfile =
    typeof safety?.intensity_max === 'number' ? safety.intensity_max : 1
  const maxBySafeMode =
    safeMode && typeof safety?.safe_mode_clamps?.max_intensity === 'number'
      ? safety.safe_mode_clamps.max_intensity
      : 1
  const max = Math.min(1, maxByProfile, maxBySafeMode)
  return clamp(i0, 0, max)
}

