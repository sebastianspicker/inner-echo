/**
 * SSOT: delay — short echo with low feedback (safety-clamped).
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../utils/numeric'

export interface DelayParams {
  /** Delay time in seconds. */
  time?: number
  /** Feedback gain 0..1 (keep low). */
  feedback?: number
  /** Wet mix 0..1 (keep low). */
  mix?: number
}

const DEFAULT_TIME = 0.14
const DEFAULT_FEEDBACK = 0.06
const DEFAULT_MIX = 0.03

export function createDelay(context: BaseAudioContext, params: DelayParams = {}): AudioModule {
  const input = context.createGain()
  input.gain.value = 1

  const dry = context.createGain()
  const wet = context.createGain()
  const out = context.createGain()

  const delay = context.createDelay(1.0)
  const feedbackGain = context.createGain()

  const set = (p: DelayParams) => {
    const time = clamp(p.time ?? DEFAULT_TIME, 0.05, 0.35)
    const feedback = clamp(p.feedback ?? DEFAULT_FEEDBACK, 0, 0.18)
    const mix = clamp(p.mix ?? DEFAULT_MIX, 0, 0.12)
    delay.delayTime.setValueAtTime(time, context.currentTime)
    feedbackGain.gain.setValueAtTime(feedback, context.currentTime)
    dry.gain.setValueAtTime(1 - mix, context.currentTime)
    wet.gain.setValueAtTime(mix, context.currentTime)
  }

  set(params)

  input.connect(dry)
  input.connect(delay)
  delay.connect(feedbackGain)
  feedbackGain.connect(delay)
  delay.connect(wet)

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
        time: p.time as number | undefined,
        feedback: p.feedback as number | undefined,
        mix: p.mix as number | undefined,
      })
    },
    dispose(): void {
      input.disconnect()
      dry.disconnect()
      wet.disconnect()
      out.disconnect()
      delay.disconnect()
      feedbackGain.disconnect()
    },
  }
}

