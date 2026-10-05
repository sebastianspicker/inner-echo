import type { AudioModule } from '../types'
import { clamp } from '../../../shared/numbers'

export interface BiquadFilterParams {
  cutoff?: number
  q?: number
  /** Sweep LFO rate in Hz (lowpass only). */
  sweep_rate?: number
  /** Sweep depth in octaves (lowpass only). */
  sweep_depth?: number
}

interface BiquadFilterConfig {
  type: BiquadFilterType
  defaultCutoff: number
  cutoffRange: readonly [number, number]
  defaultQ: number
  qRange: readonly [number, number]
  /** Adds a slow LFO sweep of the cutoff. */
  sweep?: boolean
}

const SWEEP_RATE_RANGE = [0, 0.6] as const
const SWEEP_DEPTH_RANGE = [0, 3] as const

function createSweep(context: BaseAudioContext, filter: BiquadFilterNode, rate: number) {
  const lfo = context.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = rate
  const gain = context.createGain()
  lfo.connect(gain)
  gain.connect(filter.frequency)
  lfo.start(0)
  return {
    setRate: (value: number, now: number) => lfo.frequency.setValueAtTime(value, now),
    setAmount: (value: number, now: number) => gain.gain.setValueAtTime(value, now),
    dispose(): void {
      try {
        lfo.stop()
      } catch {
        // already stopped
      }
      lfo.disconnect()
      gain.disconnect()
    },
  }
}

export function createBiquadFilterModule(
  context: BaseAudioContext,
  params: BiquadFilterParams,
  config: BiquadFilterConfig,
): AudioModule {
  const initialCutoff = clamp(params.cutoff ?? config.defaultCutoff, ...config.cutoffRange)
  const initialQ = clamp(params.q ?? config.defaultQ, ...config.qRange)
  const initialSweepRate = clamp(params.sweep_rate ?? 0, ...SWEEP_RATE_RANGE)
  const initialSweepDepth = clamp(params.sweep_depth ?? 0, ...SWEEP_DEPTH_RANGE)
  const filter = context.createBiquadFilter()
  filter.type = config.type
  filter.frequency.value = initialCutoff
  filter.Q.value = initialQ

  const input = context.createGain()
  input.gain.value = 1
  input.connect(filter)

  let cutoff = initialCutoff
  let depth = initialSweepDepth
  const sweep = config.sweep ? createSweep(context, filter, initialSweepRate) : null
  // Cutoff swings between cutoff * 2^-depth and cutoff * (2 - 2^-depth).
  const applySweepDepth = (now: number) => sweep?.setAmount(cutoff * (1 - 2 ** -depth), now)
  applySweepDepth(context.currentTime)

  return {
    connect(destination: AudioNode): void {
      filter.connect(destination)
    },
    getInput(): AudioNode {
      return input
    },
    setParams(next: Record<string, unknown>): void {
      const now = context.currentTime
      const nextCutoff = next.cutoff as number | undefined
      const q = next.q as number | undefined
      if (typeof nextCutoff === 'number') {
        cutoff = clamp(nextCutoff, ...config.cutoffRange)
        filter.frequency.setValueAtTime(cutoff, now)
      }
      if (typeof q === 'number') {
        filter.Q.setValueAtTime(clamp(q, ...config.qRange), now)
      }
      if (typeof next.sweep_rate === 'number') {
        sweep?.setRate(clamp(next.sweep_rate, ...SWEEP_RATE_RANGE), now)
      }
      if (typeof next.sweep_depth === 'number') {
        depth = clamp(next.sweep_depth, ...SWEEP_DEPTH_RANGE)
      }
      if (typeof nextCutoff === 'number' || typeof next.sweep_depth === 'number') {
        applySweepDepth(now)
      }
    },
    resetParams(): void {
      const now = context.currentTime
      cutoff = initialCutoff
      depth = initialSweepDepth
      filter.frequency.setValueAtTime(initialCutoff, now)
      filter.Q.setValueAtTime(initialQ, now)
      sweep?.setRate(initialSweepRate, now)
      applySweepDepth(now)
    },
    dispose(): void {
      sweep?.dispose()
      input.disconnect()
      filter.disconnect()
    },
  }
}
