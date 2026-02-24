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

/**
 * Apply exponential smoothing: smoothed += (target - smoothed) * (1 - exp(-dt / tau)).
 * Uses separate attack and release time constants for asymmetric response.
 * 
 * @param current - Current smoothed value
 * @param target - Target value to approach
 * @param dt - Time delta in seconds
 * @param attack - Attack time constant (seconds) for rising values
 * @param release - Release time constant (seconds) for falling values
 * @returns New smoothed value
 */
export function smoothStep(
  current: number,
  target: number,
  dt: number,
  attack: number,
  release: number
): number {
  const tau = target > current ? attack : release
  if (tau <= 0) return target
  const t = 1 - Math.exp(-dt / tau)
  return current + (target - current) * t
}
