/**
 * Small-room convolver with a generated impulse and no external assets.
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../shared/numbers'
import { createDryWetMix } from './dryWetMix'
import { createRoutedAudioModule } from './routedAudioModule'

export interface ReverbParams {
  /** Wet mix 0..0.5. The convolver normalises the impulse, so wet and dry are level-matched. */
  mix?: number
  /** Decay time in seconds. */
  decay?: number
}

const DEFAULT_MIX = 0.05
const DEFAULT_DECAY = 1.3
const MAX_MIX = 0.5

const PRE_DELAY_SECONDS = 0.012
// One-pole lowpass coefficient: open at the start of the tail, dark at the end.
const DAMPING_START = 1
const DAMPING_END = 0.12

function makeImpulse(context: BaseAudioContext, decaySeconds: number): AudioBuffer {
  const sr = context.sampleRate
  const length = Math.max(1, Math.floor(sr * decaySeconds))
  const preDelay = Math.min(length, Math.floor(sr * PRE_DELAY_SECONDS))
  const buffer = context.createBuffer(2, length, sr)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    let lp = 0
    for (let i = preDelay; i < length; i++) {
      const t = i / sr
      const k = DAMPING_START + (DAMPING_END - DAMPING_START) * (i / length)
      lp += k * (Math.random() * 2 - 1 - lp)
      data[i] = lp * Math.exp(-t / Math.max(0.001, decaySeconds * 0.55))
    }
  }
  return buffer
}

export function createReverb(context: BaseAudioContext, params: ReverbParams = {}): AudioModule {
  const initial: Required<ReverbParams> = {
    mix: clamp(params.mix ?? DEFAULT_MIX, 0, MAX_MIX),
    decay: clamp(params.decay ?? DEFAULT_DECAY, 0.6, 2.8),
  }
  let current = { ...initial }
  const mixNodes = createDryWetMix(context)

  const convolver = context.createConvolver()

  let lastDecay = -1

  const set = (p: ReverbParams) => {
    current = {
      mix: p.mix ?? current.mix,
      decay: p.decay ?? current.decay,
    }
    const mix = clamp(current.mix, 0, MAX_MIX)
    const decay = clamp(current.decay, 0.6, 2.8)

    mixNodes.setMix(mix)

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

  mixNodes.connectWetSource(convolver)

  return createRoutedAudioModule({
    input: mixNodes.input,
    output: mixNodes.out,
    setParams(p: Record<string, unknown>): void {
      set({
        mix: p.mix as number | undefined,
        decay: p.decay as number | undefined,
      })
    },
    resetParams(): void {
      current = { ...initial }
      set(initial)
    },
    dispose(): void {
      mixNodes.dispose()
      convolver.disconnect()
      convolver.buffer = null
    },
  })
}
