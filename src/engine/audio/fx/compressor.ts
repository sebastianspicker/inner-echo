/**
 * Phase 7: Compressor/limiter (DynamicsCompressorNode) for safe ceiling.
 */

import type { AudioModule } from '../types'

export interface CompressorParams {
  threshold?: number
  ratio?: number
  attack?: number
  release?: number
  ceiling?: number
}

const DEFAULT_THRESHOLD = -20
const DEFAULT_RATIO = 3
const DEFAULT_ATTACK = 0.02
const DEFAULT_RELEASE = 0.25
const DEFAULT_CEILING = -6

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function createCompressor(
  context: BaseAudioContext,
  params: CompressorParams = {}
): AudioModule {
  const comp = context.createDynamicsCompressor()
  comp.threshold.value = clamp(params.threshold ?? DEFAULT_THRESHOLD, -40, -10)
  comp.ratio.value = clamp(params.ratio ?? DEFAULT_RATIO, 2, 12)
  comp.attack.value = clamp(params.attack ?? DEFAULT_ATTACK, 0.001, 0.05)
  comp.release.value = clamp(params.release ?? DEFAULT_RELEASE, 0.05, 0.6)

  const input = context.createGain()
  input.gain.value = 1
  input.connect(comp)

  const ceilingGain = context.createGain()
  comp.connect(ceilingGain)
  // SSOT: audio ceiling is clamped to be at most -6 dBFS (i.e., never louder than -6).
  const ceilingDb = clamp(params.ceiling ?? DEFAULT_CEILING, -24, -6)
  ceilingGain.gain.value = 10 ** (ceilingDb / 20)

  return {
    connect(destination: AudioNode): void {
      ceilingGain.connect(destination)
    },
    getInput(): AudioNode {
      return input
    },
    setParams(p: Record<string, unknown>): void {
      const t = p.threshold as number | undefined
      const r = p.ratio as number | undefined
      const a = p.attack as number | undefined
      const rel = p.release as number | undefined
      const c = p.ceiling as number | undefined
      if (typeof t === 'number') comp.threshold.setValueAtTime(clamp(t, -40, -10), context.currentTime)
      if (typeof r === 'number') comp.ratio.setValueAtTime(clamp(r, 2, 12), context.currentTime)
      if (typeof a === 'number') comp.attack.setValueAtTime(clamp(a, 0.001, 0.05), context.currentTime)
      if (typeof rel === 'number') comp.release.setValueAtTime(clamp(rel, 0.05, 0.6), context.currentTime)
      if (typeof c === 'number') {
        const ceilingDb = clamp(c, -24, -6)
        ceilingGain.gain.setValueAtTime(10 ** (ceilingDb / 20), context.currentTime)
      }
    },
    dispose(): void {
      input.disconnect()
      comp.disconnect()
      ceilingGain.disconnect()
    },
  }
}
