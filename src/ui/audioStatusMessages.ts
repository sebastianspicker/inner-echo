import type { AudioContextStatus } from '../engine/audio'

export function getAudioStateLabel(
  status: AudioContextStatus,
  conditionAudioEnabled: boolean,
): string {
  if (status === 'on') return conditionAudioEnabled ? 'on' : 'muted (engine on)'
  if (status === 'starting') return 'starting\u2026'
  return status
}
