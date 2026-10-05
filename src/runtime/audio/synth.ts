/**
 * Audio Synthesizer
 *
 * Built-in profile synth: two detuned oscillators plus a quiet sawtooth layer, with optional
 * sparse swells (see `synthScheduler.ts`) so delay and reverb have something to ring on.
 * It acts as the default audio source when the microphone is disabled.
 * The output is a single Web Audio `GainNode` that gets piped into the `AudioEngine`'s effects chain.
 */

import { clamp } from '../../shared/numbers'
import { createSwellScheduler } from './synthScheduler'
import type { AudioModule } from './types'

const DEFAULT_FREQ = 220
const DEFAULT_DETUNE = 8
const DEFAULT_BRIGHTNESS = 0.5
const OSC_GAIN = 0.2
// The detuned voice is quieter so the pair never beats down to silence.
const DETUNED_GAIN = 0.12
const SAW_GAIN = 0.14

export interface SynthParams {
  /** Base frequency (Hz), 55..440. */
  frequency?: number
  /** Detune (cents) for second oscillator, 0..40. */
  detune?: number
  waveform?: 'sine' | 'triangle'
  /** Level of the sawtooth harmonic layer, 0..1. */
  brightness?: number
  /** Seconds between swells, 0..30 (0 = none). */
  swell_interval?: number
}

const clampFrequency = (v: number) => clamp(v, 55, 440)
const clampDetune = (v: number) => clamp(v, 0, 40)
const clampBrightness = (v: number) => clamp(v, 0, 1)
const clampInterval = (v: number) => clamp(v, 0, 30)

/**
 * Create the profile synth. Output is a single GainNode.
 */
export function createSynth(context: BaseAudioContext, params: SynthParams = {}): AudioModule {
  let freq = clampFrequency(params.frequency ?? DEFAULT_FREQ)
  const waveform = params.waveform === 'sine' ? 'sine' : 'triangle'

  const outGain = context.createGain()
  outGain.gain.value = 1

  const makeOsc = (type: OscillatorType, frequency: number, level: number) => {
    const osc = context.createOscillator()
    osc.type = type
    osc.frequency.value = frequency
    const gain = context.createGain()
    gain.gain.value = level
    osc.connect(gain)
    gain.connect(outGain)
    osc.start(0)
    return { osc, gain }
  }

  const o1 = makeOsc(waveform, freq, OSC_GAIN)
  const o2 = makeOsc(waveform, freq, DETUNED_GAIN)
  o2.osc.detune.value = clampDetune(params.detune ?? DEFAULT_DETUNE)
  // A sawtooth layer supplies the upper harmonics that the profile filters shape; `brightness`
  // sets how much of it is present.
  const o3 = makeOsc(
    'sawtooth',
    freq,
    SAW_GAIN * clampBrightness(params.brightness ?? DEFAULT_BRIGHTNESS),
  )
  const swells = createSwellScheduler(context, outGain)
  swells.start(clampInterval(params.swell_interval ?? 0), freq)

  return {
    connect(destination: AudioNode): void {
      outGain.connect(destination)
    },
    getInput(): AudioNode {
      return outGain
    },
    setParams(p: Record<string, unknown>): void {
      const now = context.currentTime
      if (typeof p.frequency === 'number') {
        freq = clampFrequency(p.frequency)
        o1.osc.frequency.setValueAtTime(freq, now)
        o2.osc.frequency.setValueAtTime(freq, now)
        o3.osc.frequency.setValueAtTime(freq, now)
        swells.setBaseFrequency(freq, now)
      }
      if (typeof p.detune === 'number') {
        o2.osc.detune.setValueAtTime(clampDetune(p.detune), now)
      }
      if (typeof p.brightness === 'number') {
        o3.gain.gain.setValueAtTime(SAW_GAIN * clampBrightness(p.brightness), now)
      }
      if (typeof p.swell_interval === 'number') {
        swells.start(clampInterval(p.swell_interval), freq)
      }
    },
    dispose(): void {
      swells.dispose()
      for (const { osc, gain } of [o1, o2, o3]) {
        try {
          osc.stop()
        } catch {
          // already stopped
        }
        osc.disconnect()
        gain.disconnect()
      }
      outGain.disconnect()
    },
  }
}
