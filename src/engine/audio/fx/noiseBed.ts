/**
 * Phase 7: Noise bed — filtered noise for texture (profile chain node).
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../utils/numeric'

export interface NoiseBedParams {
  level?: number
  color?: 'white' | 'pink' | 'brown'
}

// SSOT defaults lean quieter; level is safety-clamped at runtime.
const DEFAULT_LEVEL = 0.03
const MAX_LEVEL = 0.08

function normalizeColor(color: unknown): 'white' | 'pink' | 'brown' {
  const c = String(color ?? 'pink').toLowerCase()
  if (c === 'white' || c === 'brown') return c
  return 'pink'
}

function createNoiseBuffer(context: BaseAudioContext, color: 'white' | 'pink' | 'brown', durationSeconds: number): AudioBuffer {
  const sampleRate = context.sampleRate
  const length = Math.ceil(sampleRate * durationSeconds)
  const buffer = context.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  let pink0 = 0
  let pink1 = 0
  let pink2 = 0
  let brown = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (color === 'white') {
      data[i] = white
      continue
    }
    if (color === 'brown') {
      // First-order integration of white noise -> brown-ish spectrum.
      brown = (brown + 0.02 * white) / 1.02
      data[i] = clamp(brown * 3.2, -1, 1)
      continue
    }
    // Pink-ish approximation using parallel filtered accumulators.
    pink0 = 0.99886 * pink0 + white * 0.0555179
    pink1 = 0.99332 * pink1 + white * 0.0750759
    pink2 = 0.969 * pink2 + white * 0.153852
    data[i] = clamp((pink0 + pink1 + pink2) / 3, -1, 1)
  }
  return buffer
}

export function createNoiseBed(context: BaseAudioContext, params: NoiseBedParams = {}): AudioModule {
  const level = clamp(params.level ?? DEFAULT_LEVEL, 0, MAX_LEVEL)
  let color = normalizeColor(params.color)

  const buffer = createNoiseBuffer(context, color, 3)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const gain = context.createGain()
  gain.gain.value = level
  source.connect(gain)
  source.start(0)

  const input = context.createGain()
  input.gain.value = 0
  input.connect(gain)

  return {
    connect(destination: AudioNode): void {
      gain.connect(destination)
    },
    getInput(): AudioNode {
      return input
    },
    setParams(p: Record<string, unknown>): void {
      const l = p.level as number | undefined
      if (typeof l === 'number') gain.gain.setValueAtTime(clamp(l, 0, MAX_LEVEL), context.currentTime)
      const c = p.color as string | undefined
      if (typeof c === 'string') {
        const nextColor = normalizeColor(c)
        if (nextColor !== color) {
          color = nextColor
          source.buffer = createNoiseBuffer(context, color, 3)
        }
      }
    },
    dispose(): void {
      try {
        source.stop()
      } catch {
        // ignore
      }
      source.disconnect()
      gain.disconnect()
      input.disconnect()
    },
  }
}
