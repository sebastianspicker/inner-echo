import type { AudioStackConfig } from '../../conditions/schema'

export function getAudioStackTargetVolume(stack: AudioStackConfig | null | undefined): number {
  if (stack?.enabled !== true) return 0
  return stack.master?.volume ?? 0.22
}

export function getAudioContextTime(context: AudioContext | null): number {
  return context ? context.currentTime : 0
}
