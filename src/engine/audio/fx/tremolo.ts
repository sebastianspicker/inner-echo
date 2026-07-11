/**
 * Tremolo/flutter FX: LFO modulates gain by rate and depth.
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../utils/numeric'

export interface TremoloParams {
  /** LFO rate in Hz. */
  rate?: number
  /** Depth 0..1 (gain modulation amount). */
  depth?: number
}

const DEFAULT_RATE = 3
const DEFAULT_DEPTH = 0.15
// SSOT safety clamps
const MAX_RATE_HZ = 4
const MAX_DEPTH = 0.15

export function createTremolo(context: BaseAudioContext, params: TremoloParams = {}): AudioModule {
  const rate = clamp(params.rate ?? DEFAULT_RATE, 0.1, MAX_RATE_HZ)
  const depth = clamp(params.depth ?? DEFAULT_DEPTH, 0, MAX_DEPTH)

  const input = context.createGain()
  input.gain.value = 1

  const modGain = context.createGain()
  modGain.gain.value = 1

  const lfo = context.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = rate

  const depthGain = context.createGain()
  depthGain.gain.value = -0.5 * depth

  const offset = context.createConstantSource()
  offset.offset.value = 1 - 0.5 * depth

  lfo.connect(depthGain)
  depthGain.connect(modGain.gain)
  offset.connect(modGain.gain)
  offset.start(0)
  lfo.start(0)

  input.connect(modGain)

  return {
    connect(destination: AudioNode): void {
      modGain.connect(destination)
    },
    getInput(): AudioNode {
      return input
    },
    setParams(p: Record<string, unknown>): void {
      const r = p.rate as number | undefined
      const d = p.depth as number | undefined
      if (typeof r === 'number')
        lfo.frequency.setValueAtTime(clamp(r, 0.1, MAX_RATE_HZ), context.currentTime)
      if (typeof d === 'number') {
        const depthClamped = clamp(d, 0, MAX_DEPTH)
        depthGain.gain.setValueAtTime(-0.5 * depthClamped, context.currentTime)
        offset.offset.setValueAtTime(1 - 0.5 * depthClamped, context.currentTime)
      }
    },
    dispose(): void {
      try {
        lfo.stop()
        offset.stop()
      } catch {
        // already stopped
      }
      input.disconnect()
      lfo.disconnect()
      depthGain.disconnect()
      offset.disconnect()
      modGain.disconnect()
    },
  }
}
