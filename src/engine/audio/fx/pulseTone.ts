/**
 * SSOT: pulse_tone — a very quiet pulsing tone mixed into the chain (safety-first).
 *
 * Params:
 * - rate (Hz)
 * - mix (0..1, kept very low)
 * - base_freq (Hz)
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../utils/numeric'

export interface PulseToneParams {
  rate?: number
  mix?: number
  base_freq?: number
}

const DEFAULT_RATE = 1.0
const DEFAULT_MIX = 0.06
const DEFAULT_FREQ = 120

export function createPulseTone(
  context: BaseAudioContext,
  params: PulseToneParams = {},
): AudioModule {
  const input = context.createGain()
  input.gain.value = 1

  const out = context.createGain()
  out.gain.value = 1

  // Pass-through for existing chain audio.
  input.connect(out)

  // Tone generator.
  const osc = context.createOscillator()
  osc.type = 'sine'
  const toneGain = context.createGain()
  toneGain.gain.value = 0

  // Envelope LFO (amplitude modulation).
  const lfo = context.createOscillator()
  lfo.type = 'sine'
  const lfoGain = context.createGain()
  const offset = context.createConstantSource()

  lfo.connect(lfoGain)
  lfoGain.connect(toneGain.gain)
  offset.connect(toneGain.gain)
  offset.start(0)

  osc.connect(toneGain)
  toneGain.connect(out)
  osc.start(0)
  lfo.start(0)

  const set = (p: PulseToneParams) => {
    const rate = clamp(p.rate ?? DEFAULT_RATE, 0.2, 3)
    const baseFreq = clamp(p.base_freq ?? DEFAULT_FREQ, 60, 220)
    // mix is intentionally capped (SSOT uses <= 0.10).
    const mix = clamp(p.mix ?? DEFAULT_MIX, 0, 0.12)

    osc.frequency.setValueAtTime(baseFreq, context.currentTime)
    lfo.frequency.setValueAtTime(rate, context.currentTime)

    // LFO maps [-1,1] -> [0,1] then scaled by mix.
    lfoGain.gain.setValueAtTime(0.5 * mix, context.currentTime)
    offset.offset.setValueAtTime(0.5 * mix, context.currentTime)
  }

  set(params)

  return {
    connect(destination: AudioNode): void {
      out.connect(destination)
    },
    getInput(): AudioNode {
      return input
    },
    setParams(p: Record<string, unknown>): void {
      set({
        rate: p.rate as number | undefined,
        mix: p.mix as number | undefined,
        base_freq: p.base_freq as number | undefined,
      })
    },
    dispose(): void {
      try {
        osc.stop()
        lfo.stop()
        offset.stop()
      } catch {
        // ignore
      }
      input.disconnect()
      out.disconnect()
      osc.disconnect()
      lfo.disconnect()
      lfoGain.disconnect()
      offset.disconnect()
      toneGain.disconnect()
    },
  }
}
