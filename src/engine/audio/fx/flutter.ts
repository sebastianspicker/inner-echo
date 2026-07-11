/**
 * SSOT: flutter — subtle time instability via modulated micro-delay (safety-clamped).
 *
 * Params:
 * - rate (Hz)
 * - depth (0..1) mapped to a few milliseconds of modulation.
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../utils/numeric'

export interface FlutterParams {
  rate?: number
  depth?: number
}

const DEFAULT_RATE = 0.55
const DEFAULT_DEPTH = 0.05

export function createFlutter(context: BaseAudioContext, params: FlutterParams = {}): AudioModule {
  let current: Required<FlutterParams> = {
    rate: params.rate ?? DEFAULT_RATE,
    depth: params.depth ?? DEFAULT_DEPTH,
  }
  const input = context.createGain()
  input.gain.value = 1

  const out = context.createGain()
  out.gain.value = 1

  const delay = context.createDelay(0.05)
  delay.delayTime.value = 0.008

  const lfo = context.createOscillator()
  lfo.type = 'sine'

  const depthGain = context.createGain()
  depthGain.gain.value = 0.0003

  // The constant source provides a fixed DC offset for the delay line center point.
  // Unlike tremolo, flutter intentionally keeps a fixed modulation depth — the LFO
  // amplitude is set at construction and only the rate changes at runtime via setParams.
  const offset = context.createConstantSource()
  offset.offset.value = 0.008

  lfo.connect(depthGain)
  depthGain.connect(delay.delayTime)
  offset.connect(delay.delayTime)
  offset.start(0)
  lfo.start(0)

  const set = (p: FlutterParams) => {
    current = {
      rate: p.rate ?? current.rate,
      depth: p.depth ?? current.depth,
    }
    const rate = clamp(current.rate, 0.1, 1.2)
    const depth = clamp(current.depth, 0, 0.12)
    // depth maps to ~0..6ms modulation (conservative).
    depthGain.gain.setValueAtTime(depth * 0.006, context.currentTime)
    lfo.frequency.setValueAtTime(rate, context.currentTime)
  }

  set(params)

  input.connect(delay)
  delay.connect(out)

  return {
    connect(destination: AudioNode): void {
      out.connect(destination)
    },
    getInput(): AudioNode {
      return input
    },
    setParams(p: Record<string, unknown>): void {
      set({ rate: p.rate as number | undefined, depth: p.depth as number | undefined })
    },
    dispose(): void {
      try {
        lfo.stop()
        offset.stop()
      } catch {
        // ignore
      }
      input.disconnect()
      delay.disconnect()
      out.disconnect()
      lfo.disconnect()
      depthGain.disconnect()
      offset.disconnect()
    },
  }
}
