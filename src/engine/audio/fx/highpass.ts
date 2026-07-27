/**
 * Highpass filter FX for profile audio chains.
 */

import type { AudioModule } from '../types'
import { createBiquadFilterModule, type BiquadFilterParams } from './biquadFilter'

export interface HighpassParams extends BiquadFilterParams {}

const DEFAULT_CUTOFF = 160
const DEFAULT_Q = 0.7

export function createHighpass(
  context: BaseAudioContext,
  params: HighpassParams = {},
): AudioModule {
  return createBiquadFilterModule(context, params, {
    type: 'highpass',
    defaultCutoff: DEFAULT_CUTOFF,
    cutoffRange: [50, 500],
    defaultQ: DEFAULT_Q,
    qRange: [0.5, 1.2],
  })
}
