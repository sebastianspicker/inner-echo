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
export { startAudioContext, closeAudioContext } from './contextManager'
export type {
  AudioEngineControl,
  AudioEngineDebugState,
} from './audioEngine'
export { loadAudioEngine, type AudioEngineFactory } from './loadAudioEngine'
export { buildAudioChain, connectAudioChain } from './audioGraphBuilder'
export { DEFAULT_MASTER_VOLUME } from './audioStackValues'
