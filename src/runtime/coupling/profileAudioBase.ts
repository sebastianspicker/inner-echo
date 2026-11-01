import { scaleAudioParam } from '../../domain/experience/audioIntensity'
import type { Profile } from '../../domain/experience/schema'

export function getProfileAudioParam(profile: Profile, key: string): number | undefined {
  const parts = key.split('.')
  if (parts.length < 3) return undefined
  const index = Number(parts[1])
  if (!Number.isFinite(index) || index < 0) return undefined
  const value = profile.audio_stack?.chain?.[index]?.params?.[parts.slice(2).join('.')]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function getProfileAudioBase(profile: Profile, key: string): number {
  return getProfileAudioParam(profile, key) ?? 0
}

export function getScaledProfileAudioBase(
  profile: Profile,
  key: string,
  intensity: number,
): number {
  const parts = key.split('.')
  const nodeType = profile.audio_stack?.chain?.[Number(parts[1])]?.node ?? ''
  return scaleAudioParam(
    nodeType,
    parts.slice(2).join('.'),
    getProfileAudioBase(profile, key),
    intensity,
  )
}
