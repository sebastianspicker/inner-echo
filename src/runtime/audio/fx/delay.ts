/**
 * SSOT: delay: short echo with low feedback (safety-clamped).
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../shared/numbers'
import { createDryWetMix } from './dryWetMix'
import { createRoutedAudioModule } from './routedAudioModule'

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
  let current: Required<DelayParams> = {
    time: params.time ?? DEFAULT_TIME,
    feedback: params.feedback ?? DEFAULT_FEEDBACK,
    mix: params.mix ?? DEFAULT_MIX,
  }
  const mixNodes = createDryWetMix(context)

  const delay = context.createDelay(1.0)
  const feedbackGain = context.createGain()

  const set = (p: DelayParams) => {
    current = {
      time: p.time ?? current.time,
      feedback: p.feedback ?? current.feedback,
      mix: p.mix ?? current.mix,
    }
    const time = clamp(current.time, 0.05, 0.35)
    const feedback = clamp(current.feedback, 0, 0.18)
    const mix = clamp(current.mix, 0, 0.12)
    delay.delayTime.setValueAtTime(time, context.currentTime)
    feedbackGain.gain.setValueAtTime(feedback, context.currentTime)
    mixNodes.setMix(mix)
  }

  set(params)

  delay.connect(feedbackGain)
  feedbackGain.connect(delay)
  mixNodes.connectWetSource(delay)

  return createRoutedAudioModule({
    input: mixNodes.input,
    output: mixNodes.out,
    setParams(p: Record<string, unknown>): void {
      set({
        time: p.time as number | undefined,
        feedback: p.feedback as number | undefined,
        mix: p.mix as number | undefined,
      })
    },
    dispose(): void {
      mixNodes.dispose()
      delay.disconnect()
      feedbackGain.disconnect()
    },
  })
}
