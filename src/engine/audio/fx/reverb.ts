/**
 * SSOT: reverb — small-room convolver with generated impulse (no external assets).
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../utils/numeric'
import { fastRandom } from '../../../utils/fastRandom'

export interface ReverbParams {
  /** Wet mix 0..1 (keep low). */
  mix?: number
  /** Decay time in seconds. */
  decay?: number
}

const DEFAULT_MIX = 0.05
const DEFAULT_DECAY = 1.3

function makeImpulse(context: BaseAudioContext, decaySeconds: number): AudioBuffer {
  const sr = context.sampleRate
  const length = Math.max(1, Math.floor(sr * decaySeconds))
  const buffer = context.createBuffer(2, length, sr)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      const t = i / sr
      // Exponential decay + gentle high-frequency damping via power.
      const env = Math.exp(-t / Math.max(0.001, decaySeconds * 0.55))
      const noise = (fastRandom() * 2 - 1) * (1 - i / length) ** 1.5
      data[i] = noise * env
    }
  }
  return buffer
}

export function createReverb(context: BaseAudioContext, params: ReverbParams = {}): AudioModule {
  let current: Required<ReverbParams> = {
    mix: params.mix ?? DEFAULT_MIX,
    decay: params.decay ?? DEFAULT_DECAY,
  }
  const input = context.createGain()
  input.gain.value = 1

  const dry = context.createGain()
  const wet = context.createGain()
  const out = context.createGain()

  const convolver = context.createConvolver()

  let lastDecay = -1

  const set = (p: ReverbParams) => {
    current = {
      mix: p.mix ?? current.mix,
      decay: p.decay ?? current.decay,
    }
    const mix = clamp(current.mix, 0, 0.12)
    const decay = clamp(current.decay, 0.6, 2.8)

    dry.gain.setValueAtTime(1 - mix, context.currentTime)
    wet.gain.setValueAtTime(mix, context.currentTime)

    // Regenerate impulse only when decay changes meaningfully.
    // Note: makeImpulse blocks the main thread synchronously, but the >0.08
    // threshold guard ensures this only fires on significant decay changes,
    // which is sufficient for current usage patterns.
    if (Math.abs(decay - lastDecay) > 0.08) {
      convolver.buffer = makeImpulse(context, decay)
      lastDecay = decay
    }
  }

  set(params)

  input.connect(dry)
  input.connect(convolver)
  convolver.connect(wet)
  dry.connect(out)
  wet.connect(out)

  return {
    connect(destination: AudioNode): void {
      out.connect(destination)
    },
    getInput(): AudioNode {
      return input
    },
    setParams(p: Record<string, unknown>): void {
      set({
        mix: p.mix as number | undefined,
        decay: p.decay as number | undefined,
      })
    },
    dispose(): void {
      input.disconnect()
      dry.disconnect()
      wet.disconnect()
      out.disconnect()
      convolver.disconnect()
      convolver.buffer = null
    },
  }
}
