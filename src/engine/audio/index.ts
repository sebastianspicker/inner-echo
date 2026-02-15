/**
 * Phase 7: Audio engine (no mic). Native WebAudio only.
 */

export type {
  AudioContextStatus,
  AudioModule,
  AudioEngineParams,
  AudioStackConfig,
  AudioChainNodeDef,
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
export type { AudioContextManagerListener } from './contextManager'
export { createSynth } from './synth'
export { createAudioEngine } from './audioEngine'
export type { AudioEngineControl, AudioEngineCallbacks } from './audioEngine'
export { buildAudioChain, connectAudioChain, rampGain } from './audioGraphBuilder'
export {
  createLowpass,
  createHighpass,
  createTremolo,
  createNoiseBed,
  createCompressor,
} from './fx'
