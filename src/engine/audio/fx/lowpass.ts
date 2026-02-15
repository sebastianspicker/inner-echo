/**
 * Phase 7: Lowpass filter FX (BiquadFilterNode).
 */

import type { AudioModule } from '../types'

export interface LowpassParams {
  cutoff?: number
  q?: number
}

const DEFAULT_CUTOFF = 800
const DEFAULT_Q = 0.7
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function createLowpass(context: BaseAudioContext, params: LowpassParams = {}): AudioModule {
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = clamp(params.cutoff ?? DEFAULT_CUTOFF, 300, 12000)
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
      if (typeof cutoff === 'number') filter.frequency.setValueAtTime(clamp(cutoff, 300, 12000), context.currentTime)
      if (typeof q === 'number') filter.Q.setValueAtTime(clamp(q, 0.5, 1.2), context.currentTime)
    },
    dispose(): void {
      input.disconnect()
      filter.disconnect()
    },
  }
}
