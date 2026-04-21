import { clamp01 } from './types'

/**
 * Conservative nonlinear interaction matrix between experience dimensions.
 *
 * This encodes a *metaphorical* "mutual reinforcement" knob for the composer:
 * some pairs can slightly amplify each other when Interaction Amount > 0.
 *
 * Safety rules:
 * - This never bypasses global safety clamps.
 * - Defaults are intentionally small; treat as perceptual design, not a clinical model.
 */

type DimensionId = string

type InteractionMatrix = Record<string, number>

function key(a: DimensionId, b: DimensionId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

const DEFAULT_INTERACTION_MATRIX: InteractionMatrix = {
  // Conservative examples (0..1). These are *small* gains before clamps.
  [key('hyperarousal', 'intrusion')]: 0.18,
  [key('hyperarousal', 'hypervigilance')]: 0.12,
  [key('rumination_loop', 'compulsive_loop')]: 0.12,
  [key('panic_peaks', 'hyperarousal')]: 0.14,
  [key('cognitive_fog', 'attention_fragmentation')]: 0.1,
  [key('derealization', 'depersonalization')]: 0.1,
}

/**
 * Return an interaction gain in [0..1] for (a,b), scaled by interactionAmount [0..1].
 * If no entry exists, returns 0.
 */
export function getInteractionGain(
  a: DimensionId,
  b: DimensionId,
  interactionAmount: number,
  matrix: InteractionMatrix = DEFAULT_INTERACTION_MATRIX,
): number {
  const base = matrix[key(a, b)] ?? 0
  return clamp01(base) * clamp01(interactionAmount)
}
