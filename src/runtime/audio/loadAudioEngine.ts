import type { createAudioEngine } from './audioEngine'

export type AudioEngineFactory = typeof createAudioEngine

/** Loads the executable Web Audio graph only after a direct sound-start action. */
export async function loadAudioEngine(): Promise<AudioEngineFactory> {
  const module = await import('./audioEngine')
  return module.createAudioEngine
}
