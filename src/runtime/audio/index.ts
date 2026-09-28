/**
 * Public audio engine exports. Runtime uses native WebAudio only.
 */

export type {
  AudioContextStatus,
  AudioModule,
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
export type {
  AudioEngineControl,
  AudioEngineDebugState,
} from './audioEngine'
export { loadAudioEngine, type AudioEngineFactory } from './loadAudioEngine'
export { buildAudioChain, connectAudioChain, rampGain } from './audioGraphBuilder'
export {
  createLowpass,
  createHighpass,
  createTremolo,
  createNoiseBed,
  createCompressor,
} from './fx'
