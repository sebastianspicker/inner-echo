/**
 * Slow pitch wobble ("wow") from a modulated micro-delay in series with the signal.
 *
 * Params:
 * - rate (Hz), 0.1..1.2
 * - depth (0..1): LFO amplitude of the delay time, up to 8 ms around a 10 ms centre. The
 *   pitch deviation is 2*pi*rate*amplitude, so depth 0.5 at 0.4 Hz is about 1% (17 cents):
 *   an audible but gentle wow. Below about 0.2 the wobble is barely perceptible.
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../shared/numbers'
import { createRoutedAudioModule } from './routedAudioModule'

export interface FlutterParams {
  rate?: number
  depth?: number
}

const DEFAULT_RATE = 0.55
const DEFAULT_DEPTH = 0.4
/** Fixed delay-line centre point in seconds. */
export const FLUTTER_CENTER_SECONDS = 0.01
/** Delay-time swing in seconds at depth 1; stays inside the centre so the line never hits zero. */
export const FLUTTER_SECONDS_PER_DEPTH = 0.008

export function createFlutter(context: BaseAudioContext, params: FlutterParams = {}): AudioModule {
  const initial: Required<FlutterParams> = {
    rate: clamp(params.rate ?? DEFAULT_RATE, 0.1, 1.2),
    depth: clamp(params.depth ?? DEFAULT_DEPTH, 0, 1),
  }
  let current = { ...initial }
  const input = context.createGain()
  input.gain.value = 1

  const out = context.createGain()
  out.gain.value = 1

  const delay = context.createDelay(0.05)
  // AudioParam inputs sum with the intrinsic value. The constant source below
  // owns the delay's center point, so there must be no second built-in offset.
  delay.delayTime.value = 0

  const lfo = context.createOscillator()
  lfo.type = 'sine'

  const depthGain = context.createGain()
  depthGain.gain.value = initial.depth * FLUTTER_SECONDS_PER_DEPTH

  // The constant source provides a fixed DC offset for the delay line center point.
  // The LFO amplitude remains adjustable through depth at runtime.
  const offset = context.createConstantSource()
  offset.offset.value = FLUTTER_CENTER_SECONDS

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
    const depth = clamp(current.depth, 0, 1)
    depthGain.gain.setValueAtTime(depth * FLUTTER_SECONDS_PER_DEPTH, context.currentTime)
    lfo.frequency.setValueAtTime(rate, context.currentTime)
  }

  set(params)

  input.connect(delay)
  delay.connect(out)

  return createRoutedAudioModule({
    input,
    output: out,
    setParams(p: Record<string, unknown>): void {
      set({ rate: p.rate as number | undefined, depth: p.depth as number | undefined })
    },
    resetParams(): void {
      current = { ...initial }
      set(initial)
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
  })
}
