/**
 * Short echo with bounded feedback. Feedback below 1 always decays (0.6 loses 4.4 dB per
 * repeat); the output guard bounds level, so these clamps are about character, not safety.
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../shared/numbers'
import { createDryWetMix } from './dryWetMix'
import { createRoutedAudioModule } from './routedAudioModule'

export interface DelayParams {
  /** Delay time in seconds. */
  time?: number
  /** Feedback gain 0..0.6. */
  feedback?: number
  /** Wet mix 0..0.5. */
  mix?: number
}

const DEFAULT_TIME = 0.14
const DEFAULT_FEEDBACK = 0.06
const DEFAULT_MIX = 0.03
const MAX_FEEDBACK = 0.6
const MAX_MIX = 0.5

export function createDelay(context: BaseAudioContext, params: DelayParams = {}): AudioModule {
  const initial: Required<DelayParams> = {
    time: clamp(params.time ?? DEFAULT_TIME, 0.05, 0.35),
    feedback: clamp(params.feedback ?? DEFAULT_FEEDBACK, 0, MAX_FEEDBACK),
    mix: clamp(params.mix ?? DEFAULT_MIX, 0, MAX_MIX),
  }
  let current = { ...initial }
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
    const feedback = clamp(current.feedback, 0, MAX_FEEDBACK)
    const mix = clamp(current.mix, 0, MAX_MIX)
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
    resetParams(): void {
      current = { ...initial }
      set(initial)
    },
    dispose(): void {
      mixNodes.dispose()
      delay.disconnect()
      feedbackGain.disconnect()
    },
  })
}
