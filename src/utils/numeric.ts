/**
 * Numeric Utilities
 * 
 * Shared math helpers used across the entire application (Engine, Canvas, Audio, UI).
 * Primarily used to strictly confine numbers to expected safe ranges (e.g., preventing
 * volume from going above 1.0 or below 0.0).
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}
