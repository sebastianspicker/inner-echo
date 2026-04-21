/**
 * Phase 7: Audio engine (no mic). Native WebAudio only.
 */

export type {
  AudioContextStatus,
  AudioModule,
  AudioStackConfig,
  MicStatus,
  AudioInputMode,
  AudioMetrics,
} from './types'
export {
  startAudioContext,
  suspendAudioContext,
  getAudioContext,
  addAudioContextListener,
  closeAudioContext,
} from './contextManager'
export { createSynth } from './synth'
export { createAudioEngine } from './audioEngine'
export type {
  AudioEngineControl,
  AudioEngineDebugState,
} from './audioEngine'
export { buildAudioChain, connectAudioChain, rampGain } from './audioGraphBuilder'
export {
  createLowpass,
  createHighpass,
  createTremolo,
  createNoiseBed,
  createCompressor,
} from './fx'
