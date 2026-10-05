/**
 * Noise bed: filtered noise texture for profile audio chains.
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../shared/numbers'

export interface NoiseBedParams {
  level?: number
  color?: 'white' | 'pink' | 'brown'
}

// Profile defaults lean quieter; runtime safety policy clamps the level.
const DEFAULT_LEVEL = 0.03
const MAX_LEVEL = 0.08
// Every color is normalized to this RMS so `level` means the same thing across colors.
const TARGET_RMS = 0.4
const PEAK_CEILING = 0.95
// Fixed trim so the max level sits roughly -3 dB relative to the synth bed.
const TRIM_GAIN = 4.5

function normalizeColor(color: unknown): 'white' | 'pink' | 'brown' {
  const c = String(color ?? 'pink').toLowerCase()
  if (c === 'white' || c === 'brown') return c
  return 'pink'
}

function createNoiseBuffer(
  context: BaseAudioContext,
  color: 'white' | 'pink' | 'brown',
  durationSeconds: number,
): AudioBuffer {
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
    // Division by 3 is an intentional approximation (Kellett 3-pole pink noise);
    // sufficient for an ambient noise bed where scientific accuracy is not required.
    data[i] = clamp((pink0 + pink1 + pink2) / 3, -1, 1)
  }
  normalizeRms(data, TARGET_RMS)
  return buffer
}

function normalizeRms(data: Float32Array, target: number): void {
  let sum = 0
  let peak = 0
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i]
    peak = Math.max(peak, Math.abs(data[i]))
  }
  const rms = Math.sqrt(sum / Math.max(1, data.length))
  if (rms <= 0 || peak <= 0) return
  // Aim for the target RMS, but never let peaks clip: clipping would add broadband
  // distortion and turn a brown or pink bed into hiss.
  const scale = Math.min(target / rms, PEAK_CEILING / peak)
  for (let i = 0; i < data.length; i++) data[i] = clamp(data[i] * scale, -1, 1)
}

function stopSource(source: AudioBufferSourceNode): void {
  try {
    source.stop()
  } catch {
    // ignore
  }
  source.disconnect()
}

export function createNoiseBed(
  context: BaseAudioContext,
  params: NoiseBedParams = {},
): AudioModule {
  const level = clamp(params.level ?? DEFAULT_LEVEL, 0, MAX_LEVEL)
  const initialColor = normalizeColor(params.color)
  let color = initialColor

  const input = context.createGain()
  input.gain.value = 1

  const output = context.createGain()
  const noiseGain = context.createGain()
  noiseGain.gain.value = level
  const trim = context.createGain()
  trim.gain.value = TRIM_GAIN

  const initialBuffer = createNoiseBuffer(context, initialColor, 3)
  let source = context.createBufferSource()
  source.buffer = initialBuffer
  source.loop = true
  source.connect(noiseGain)
  source.start(0)

  input.connect(output)
  noiseGain.connect(trim)
  trim.connect(output)

  let replacePending = false

  function replaceSource(
    nextColor: 'white' | 'pink' | 'brown',
    replacementBuffer?: AudioBuffer,
  ): void {
    if (replacePending) return
    replacePending = true
    stopSource(source)

    const newSource = context.createBufferSource()
    newSource.buffer = replacementBuffer ?? createNoiseBuffer(context, nextColor, 3)
    newSource.loop = true
    newSource.connect(noiseGain)
    newSource.start(0)
    source = newSource
    replacePending = false
  }

  return {
    connect(destination: AudioNode): void {
      output.connect(destination)
    },
    getInput(): AudioNode {
      return input
    },
    setParams(p: Record<string, unknown>): void {
      const l = p.level as number | undefined
      if (typeof l === 'number')
        noiseGain.gain.setValueAtTime(clamp(l, 0, MAX_LEVEL), context.currentTime)
      const c = p.color as string | undefined
      if (typeof c === 'string') {
        const nextColor = normalizeColor(c)
        if (nextColor !== color) {
          color = nextColor
          replaceSource(nextColor)
        }
      }
    },
    resetParams(): void {
      noiseGain.gain.setValueAtTime(level, context.currentTime)
      if (color !== initialColor) {
        replaceSource(initialColor, initialBuffer)
        color = initialColor
      }
    },
    dispose(): void {
      stopSource(source)
      input.disconnect()
      output.disconnect()
      noiseGain.disconnect()
      trim.disconnect()
    },
  }
}
