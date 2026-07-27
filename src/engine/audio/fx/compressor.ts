/** Compressor/limiter factory with a safe output ceiling. */
import type { AudioModule } from '../types'
import { createCompressorModule } from './compressorModule'

export interface CompressorParams {
  threshold?: number
  ratio?: number
  attack?: number
  release?: number
  ceiling?: number
}

const DEFAULTS = { threshold: -20, ratio: 3, attack: 0.02, release: 0.25, ceiling: -6 }

export function createCompressor(
  context: BaseAudioContext,
  params: CompressorParams = {},
): AudioModule {
  return createCompressorModule(context, { ...DEFAULTS, ...params })
}
