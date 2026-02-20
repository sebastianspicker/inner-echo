/**
 * Audio Synthesizer
 * 
 * This module provides a simple, built-in dual-oscillator synthesizer (with an optional noise bed).
 * It acts as the default audio source when the microphone is disabled.
 * The output is a single Web Audio `GainNode` that gets piped into the `AudioEngine`'s effects chain.
 */

import type { AudioModule } from './types'

const DEFAULT_FREQ = 220
const DEFAULT_DETUNE = 8

export interface SynthParams {
  /** Base frequency (Hz). */
  frequency?: number
  /** Detune (cents) for second oscillator. */
  detune?: number
  /** Noise bed level 0..1 (optional). */
  noiseLevel?: number
}

/**
 * Create a simple two-oscillator + optional noise synth. Output is a single GainNode.
 */
export function createSynth(context: BaseAudioContext, params: SynthParams = {}): AudioModule {
  const freq = params.frequency ?? DEFAULT_FREQ
  const detune = params.detune ?? DEFAULT_DETUNE
  const noiseLevel = params.noiseLevel ?? 0

  const outGain = context.createGain()
  outGain.gain.value = 1

  const osc1 = context.createOscillator()
  osc1.type = 'sine'
  osc1.frequency.value = freq
  osc1.connect(outGain)
  osc1.start(0)

  const osc2 = context.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.value = freq
  osc2.detune.value = detune
  osc2.connect(outGain)
  osc2.start(0)

  let noiseGain: GainNode | null = null
  let bufferSource: AudioBufferSourceNode | null = null
  if (noiseLevel > 0) {
    const buffer = createNoiseBuffer(context, 2)
    bufferSource = context.createBufferSource()
    bufferSource.buffer = buffer
    bufferSource.loop = true
    noiseGain = context.createGain()
    noiseGain.gain.value = noiseLevel * 0.3
    bufferSource.connect(noiseGain)
    noiseGain.connect(outGain)
    bufferSource.start(0)
  }

  return {
    connect(destination: AudioNode): void {
      outGain.connect(destination)
    },
    getInput(): AudioNode {
      return outGain
    },
    setParams(p: Record<string, unknown>): void {
      const frequency = p.frequency as number | undefined
      const detuneVal = p.detune as number | undefined
      const noise = p.noiseLevel as number | undefined
      if (typeof frequency === 'number') {
        osc1.frequency.setValueAtTime(frequency, context.currentTime)
        osc2.frequency.setValueAtTime(frequency, context.currentTime)
      }
      if (typeof detuneVal === 'number') {
        osc2.detune.setValueAtTime(detuneVal, context.currentTime)
      }
      if (typeof noise === 'number' && noiseGain) {
        noiseGain.gain.setValueAtTime(noise * 0.3, context.currentTime)
      }
    },
    dispose(): void {
      try {
        osc1.stop()
        osc2.stop()
      } catch {
        // already stopped
      }
      osc1.disconnect()
      osc2.disconnect()
      outGain.disconnect()
      if (bufferSource) {
        try {
          bufferSource.stop()
        } catch {
          // ignore
        }
        bufferSource.disconnect()
      }
      if (noiseGain) noiseGain.disconnect()
    },
  }
}

/** Generate a short noise buffer (white or filtered for pink-ish). */
function createNoiseBuffer(context: BaseAudioContext, durationSeconds: number): AudioBuffer {
  const sampleRate = context.sampleRate
  const length = sampleRate * durationSeconds
  const buffer = context.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0,
    b1 = 0,
    b2 = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    data[i] = (b0 + b1 + b2) / 3
  }
  return buffer
}
