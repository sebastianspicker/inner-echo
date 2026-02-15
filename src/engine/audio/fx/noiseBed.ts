/**
 * Phase 7: Noise bed — filtered noise for texture (profile chain node).
 */

import type { AudioModule } from '../types'

export interface NoiseBedParams {
  level?: number
  color?: 'white' | 'pink' | 'brown'
}

// SSOT defaults lean quieter; level is safety-clamped at runtime.
const DEFAULT_LEVEL = 0.03
const MAX_LEVEL = 0.08
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function createNoiseBuffer(context: BaseAudioContext, _color: string, durationSeconds: number): AudioBuffer {
  const sampleRate = context.sampleRate
  const length = Math.ceil(sampleRate * durationSeconds)
  const buffer = context.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0,
    b1 = 0,
    b2 = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    data[i] = (b0 + b1 + b2) / 3
  }
  return buffer
}

export function createNoiseBed(context: BaseAudioContext, params: NoiseBedParams = {}): AudioModule {
  const level = clamp(params.level ?? DEFAULT_LEVEL, 0, MAX_LEVEL)
  const color = (params.color as string) ?? 'pink'

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
