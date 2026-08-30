import type { Profile } from '../../domain/experience/schema'
import { getProfileEntryForBuiltIndex } from '../../domain/experience/videoStack'
import { IMPLEMENTED_VIDEO_NODES } from '../capabilities'

export function getProfileVideoBase(profile: Profile, key: string, reducedMotion: boolean): number {
  const separator = key.indexOf('.')
  if (separator <= 0) return 0
  const builtIndex = Number(key.slice(0, separator))
  const param = key.slice(separator + 1)
  if (!Number.isFinite(builtIndex) || !param) return 0
  const value = getProfileEntryForBuiltIndex(profile, builtIndex, {
    reducedMotion,
    supportedNodeIds: IMPLEMENTED_VIDEO_NODES,
  })?.params?.[param]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
