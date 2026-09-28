/**
 * Motif definition, experience dimension definition, and dimension-to-signal mapping
 * entry shapes are content contracts owned by the zod schemas in `../schema`; re-exported
 * here (same names) so composition code keeps a single, validated source of truth.
 */
export type { MotifDef, ExperienceDimensionDef, DimensionSignalMappingEntry } from '../schema'

/**
 * Evidence strength levels for experience dimensions.
 */
export type EvidenceStrength = 'high' | 'medium' | 'low' | 'hypothesis' | string

export type ComposerMode = 'preset' | 'multimorbid' | 'symptom'

export type SelectedPreset = {
  profileId: string
  /** 0..1 contribution weight (applied before global intensity). */
  weight: number
}

export type SelectedDimension = {
  dimensionId: string
  /** 0..1 contribution weight (applied before global intensity). */
  weight: number
}

export type ComposerSettings = {
  /** 0..1 global intensity control (always clamped by safety). */
  intensity: number
  safeMode: boolean
  reducedMotion: boolean

  /** Enables condition-defined audio stack usage (AudioContext still requires user gesture). */
  audioEnabled: boolean
  /** Requests mic permission/routing when available (user gesture required). */
  micEnabled: boolean

  /** 0..1 master coupling strength applied to all coupling rules. */
  couplingStrength: number
  /**
   * 0..1 hard cap on AV feedback influence. This is a safety brake:
   * - higher values allow more modulation
   * - still clamped by global clamps and node-specific limits
   */
  maxFeedback: number

  /** 0..1 amount of nonlinear pairwise interactions between dimensions. */
  interactionAmount: number

  /** UI-only: show debug overlays/panels (never enabled by default). */
  debugOverlay: boolean
}

export { clamp01 } from '../../../shared/numbers'
