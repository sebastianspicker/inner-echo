import type { AudioStackConfig } from '../../domain/experience/schema'

export const DEFAULT_MASTER_VOLUME = 0.22

export function getAudioStackTargetVolume(stack: AudioStackConfig | null | undefined): number {
  if (stack?.enabled !== true) return 0
  return stack.master?.volume ?? DEFAULT_MASTER_VOLUME
}

export function getAudioContextTime(context: AudioContext | null): number {
  return context ? context.currentTime : 0
}
