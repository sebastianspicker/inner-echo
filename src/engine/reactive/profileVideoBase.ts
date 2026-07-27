import type { Profile } from '../../conditions/schema'
import { getProfileEntryForBuiltIndex } from '../../conditions/graphBuilder'

export function getProfileVideoBase(profile: Profile, key: string, reducedMotion: boolean): number {
  const separator = key.indexOf('.')
  if (separator <= 0) return 0
  const builtIndex = Number(key.slice(0, separator))
  const param = key.slice(separator + 1)
  if (!Number.isFinite(builtIndex) || !param) return 0
  const value = getProfileEntryForBuiltIndex(profile, builtIndex, { reducedMotion })?.params?.[
    param
  ]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
