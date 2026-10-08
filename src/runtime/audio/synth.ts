/**
 * Audio Synthesizer
 *
 * Built-in profile synth: a centre oscillator, a symmetric detuned pair spread across the stereo field, and a quiet sawtooth layer, with optional
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
const DEFAULT_SPREAD = 0.35
// Each detuned voice is quieter than the centre so the trio never beats down to silence.
const DETUNED_PAIR_GAIN = 0.09
const SAW_GAIN = 0.14

export interface SynthParams {
  /** Base frequency (Hz), 55..440. */
  frequency?: number
  /** Detune (cents) of the voice pair (+d / -d), 0..40. */
  detune?: number
  /** Stereo width of the detuned voice pair, 0..1 (0 = mono). */
  spread?: number
  waveform?: 'sine' | 'triangle'
  /** Level of the sawtooth harmonic layer, 0..1. */
  brightness?: number
  /** Seconds between swells, 0..30 (0 = none). */
  swell_interval?: number
}

const clampFrequency = (v: number) => clamp(v, 55, 440)
const clampDetune = (v: number) => clamp(v, 0, 40)
const clampBrightness = (v: number) => clamp(v, 0, 1)
const clampSpread = (v: number) => clamp(v, 0, 1)
const clampInterval = (v: number) => clamp(v, 0, 30)

interface Voice {
  osc: OscillatorNode
  gain: GainNode
  panner: StereoPannerNode | null
  /** -1 = left, 1 = right, 0 = centre. */
  side: number
}

const panFor = (side: number, spread: number) => side * 0.5 * spread

function makeVoice(
  context: BaseAudioContext,
  outGain: GainNode,
  type: OscillatorType,
  frequency: number,
  level: number,
  side = 0,
  spread = 0,
): Voice {
  const osc = context.createOscillator()
  osc.type = type
  osc.frequency.value = frequency
  const gain = context.createGain()
  gain.gain.value = level
  osc.connect(gain)
  // Side voices own a panner even at zero spread so `spread` can widen later; old Safari lacks
  // StereoPannerNode, and the voice then stays centred.
  const panner =
    side !== 0 && typeof context.createStereoPanner === 'function'
      ? context.createStereoPanner()
      : null
  if (panner) {
    panner.pan.value = panFor(side, spread)
    gain.connect(panner)
    panner.connect(outGain)
  } else {
    gain.connect(outGain)
  }
  osc.start(0)
  return { osc, gain, panner, side }
}

function disposeVoice({ osc, gain, panner }: Voice): void {
  try {
    osc.stop()
  } catch {
    // already stopped
  }
  osc.disconnect()
  gain.disconnect()
  panner?.disconnect()
}

/**
 * Create the profile synth. Output is a single GainNode.
 */
export function createSynth(context: BaseAudioContext, params: SynthParams = {}): AudioModule {
  let freq = clampFrequency(params.frequency ?? DEFAULT_FREQ)
  const waveform = params.waveform === 'sine' ? 'sine' : 'triangle'
  let spread = clampSpread(params.spread ?? DEFAULT_SPREAD)
  const detune = clampDetune(params.detune ?? DEFAULT_DETUNE)

  const outGain = context.createGain()
  outGain.gain.value = 1

  const o1 = makeVoice(context, outGain, waveform, freq, OSC_GAIN)
  // Symmetric detuned pair, panned apart by `spread`.
  const o2 = makeVoice(context, outGain, waveform, freq, DETUNED_PAIR_GAIN, -1, spread)
  const o2b = makeVoice(context, outGain, waveform, freq, DETUNED_PAIR_GAIN, 1, spread)
  o2.osc.detune.value = detune
  o2b.osc.detune.value = -detune
  // A sawtooth layer supplies the upper harmonics that the profile filters shape; `brightness`
  // sets how much of it is present.
  const o3 = makeVoice(
    context,
    outGain,
    'sawtooth',
    freq,
    SAW_GAIN * clampBrightness(params.brightness ?? DEFAULT_BRIGHTNESS),
  )
  const swells = createSwellScheduler(context, outGain)
  swells.start(clampInterval(params.swell_interval ?? 0), freq)

  const setPairParams = (p: Record<string, unknown>, now: number) => {
    if (typeof p.detune === 'number') {
      const d = clampDetune(p.detune)
      o2.osc.detune.setValueAtTime(d, now)
      o2b.osc.detune.setValueAtTime(-d, now)
    }
    if (typeof p.spread === 'number') {
      spread = clampSpread(p.spread)
      for (const { panner, side } of [o2, o2b])
        panner?.pan.setValueAtTime(panFor(side, spread), now)
    }
  }

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
        for (const v of [o1, o2, o2b, o3]) v.osc.frequency.setValueAtTime(freq, now)
        swells.setBaseFrequency(freq, now)
      }
      setPairParams(p, now)
      if (typeof p.brightness === 'number') {
        o3.gain.gain.setValueAtTime(SAW_GAIN * clampBrightness(p.brightness), now)
      }
      if (typeof p.swell_interval === 'number') {
        swells.start(clampInterval(p.swell_interval), freq)
      }
    },
    dispose(): void {
      swells.dispose()
      for (const v of [o1, o2, o2b, o3]) disposeVoice(v)
      outGain.disconnect()
    },
  }
}
