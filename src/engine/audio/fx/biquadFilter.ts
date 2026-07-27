import type { AudioModule } from '../types'
import { clamp } from '../../../utils/numeric'

export interface BiquadFilterParams {
  cutoff?: number
  q?: number
}

interface BiquadFilterConfig {
  type: BiquadFilterType
  defaultCutoff: number
  cutoffRange: readonly [number, number]
  defaultQ: number
  qRange: readonly [number, number]
}

export function createBiquadFilterModule(
  context: BaseAudioContext,
  params: BiquadFilterParams,
  config: BiquadFilterConfig,
): AudioModule {
  const filter = context.createBiquadFilter()
  filter.type = config.type
  filter.frequency.value = clamp(params.cutoff ?? config.defaultCutoff, ...config.cutoffRange)
  filter.Q.value = clamp(params.q ?? config.defaultQ, ...config.qRange)

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
    setParams(next: Record<string, unknown>): void {
      const cutoff = next.cutoff as number | undefined
      const q = next.q as number | undefined
      if (typeof cutoff === 'number') {
        filter.frequency.setValueAtTime(clamp(cutoff, ...config.cutoffRange), context.currentTime)
      }
      if (typeof q === 'number') {
        filter.Q.setValueAtTime(clamp(q, ...config.qRange), context.currentTime)
      }
    },
    dispose(): void {
      input.disconnect()
      filter.disconnect()
    },
  }
}
