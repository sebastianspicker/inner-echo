/**
 * Lowpass filter FX (BiquadFilterNode).
 */

import type { AudioModule } from '../types'
import { createBiquadFilterModule, type BiquadFilterParams } from './biquadFilter'

export interface LowpassParams extends BiquadFilterParams {}

const DEFAULT_CUTOFF = 800
const DEFAULT_Q = 0.7

export function createLowpass(context: BaseAudioContext, params: LowpassParams = {}): AudioModule {
  return createBiquadFilterModule(context, params, {
    type: 'lowpass',
    defaultCutoff: DEFAULT_CUTOFF,
    cutoffRange: [300, 12000],
    defaultQ: DEFAULT_Q,
    qRange: [0.5, 1.2],
  })
}
