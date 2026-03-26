/**
 * Phase 7: Highpass filter FX (profile compatibility, e.g. anxiety).
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../utils/numeric'

export interface HighpassParams {
  cutoff?: number
  q?: number
}

const DEFAULT_CUTOFF = 160
const DEFAULT_Q = 0.7

export function createHighpass(context: BaseAudioContext, params: HighpassParams = {}): AudioModule {
  const filter = context.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = clamp(params.cutoff ?? DEFAULT_CUTOFF, 50, 500)
  filter.Q.value = clamp(params.q ?? DEFAULT_Q, 0.5, 1.2)

  const input = context.createGain()
  input.gain.value = 1
  input.connect(filter)

  return {
    connect(destination: AudioNode): void {
      filter.connect(destination)
    },
    getInput(): AudioNode {
      return input
    },
    setParams(p: Record<string, unknown>): void {
      const cutoff = p.cutoff as number | undefined
      const q = p.q as number | undefined
      if (typeof cutoff === 'number') filter.frequency.setValueAtTime(clamp(cutoff, 50, 500), context.currentTime)
      if (typeof q === 'number') filter.Q.setValueAtTime(clamp(q, 0.5, 1.2), context.currentTime)
    },
    dispose(): void {
      input.disconnect()
      filter.disconnect()
    },
  }
}
