import type {
  AnalyserToParamDef,
  AudioStackConfig,
  Profile,
  UIControl,
  VideoStackNodeDef,
} from '../conditions/schema'

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

export type EffectiveProfile = {
  /** Effective video node stack (already reduced-motion filtered and safety clamped). */
  videoStack: VideoStackNodeDef[]
  /** Effective audio stack config (already safety clamped). */
  audioStack: AudioStackConfig
  /** Effective reactive mappings (audio→video and/or video→audio, as supported by runtime). */
  reactiveMappings: AnalyserToParamDef[]
  /** Effective safety envelope (used by UI warnings and runtime clamps). */
  safety: Profile['safety']
  /** Effective UI controls to expose (composer-specific; profile controls are not a contract). */
  uiControls: UIControl[]
}

export const DEFAULT_COMPOSER_SETTINGS: ComposerSettings = {
  intensity: 0.5,
  safeMode: false,
  reducedMotion: false,
  audioEnabled: false,
  micEnabled: false,
  couplingStrength: 0.5,
  maxFeedback: 0.35,
  interactionAmount: 0.15,
  debugOverlay: false,
}

export { clamp01 } from '../utils/numeric'

