import type { Profile } from '../../domain/experience/schema'

export function getProfileAudioBase(profile: Profile, key: string): number {
  const parts = key.split('.')
  if (parts.length < 3) return 0
  const index = Number(parts[1])
  if (!Number.isFinite(index) || index < 0) return 0
  const value = profile.audio_stack?.chain?.[index]?.params?.[parts.slice(2).join('.')]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
