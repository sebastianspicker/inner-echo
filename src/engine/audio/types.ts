/**
 * Audio engine runtime types.
 * AudioModule: create/connect, setParams, dispose.
 */

export type AudioContextStatus = 'off' | 'starting' | 'on' | 'error'

/** Microphone permission/source state. */
export type MicStatus = 'off' | 'requesting' | 'on' | 'denied' | 'error'

/** Audio input routing: synth only, mic only, or both (mix). */
export type AudioInputMode = 'synth' | 'mic' | 'mix'

/** Audio feature metrics for AV coupling. All values are normalized to 0..1. */
export interface AudioMetrics {
  /** RMS loudness (0..1-ish). */
  rms: number
  /** Spectral centroid (brightness proxy), normalized 0..1 (0 = low freq, 1 = Nyquist). */
  centroid: number
  /** Spectral flux (gentle onset proxy), normalized 0..1. */
  flux: number

  /** Optional: normalized band energies (0..1, sum not guaranteed to be 1). */
  low?: number
  mid?: number
  high?: number

  /** Optional: mic-specific metrics (post-limiter, pre-mix), normalized 0..1. */
  micRms?: number
  micCentroid?: number
  micFlux?: number
  micLow?: number
  micMid?: number
  micHigh?: number
}

/**
 * Single audio processing module (FX or source). Connects input → internal nodes → output.
 * All nodes use the same BaseAudioContext (AudioContext).
 */
export interface AudioModule {
  /** Connect this module's output to a destination node. Returns the input node for chaining. */
  connect(destination: AudioNode): void
  /** Get the input of this module (for connecting previous node to this). */
  getInput(): AudioNode
  /** Update parameters (e.g. cutoff, rate, depth). Params are node-specific. */
  setParams(params: Record<string, unknown>): void
  /** Disconnect and release resources. */
  dispose(): void
}
