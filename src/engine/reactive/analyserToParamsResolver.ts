/**
 * Resolve profile reactive.analyser_to_params targets to runtime parameter keys.
 * Target format: "video.<nodeId>.<param>" → paramKey "builtIndex.param".
 * Uses built-node index (skipped nodes excluded) so keys match what the pipeline passes to nodes.
 * Unknown targets log a warning and are skipped (no crash).
 */

import type { Profile } from '../../conditions/schema'
import { getBuiltNodeIndex } from '../../conditions/graphBuilder'
import { parseScopedTarget } from '../../utils/targetPath'

const VIDEO_PREFIX = 'video.'
const AUDIO_PREFIX = 'audio.'

export interface ResolvedMapping {
  paramKey: string
  scale: number
  offset: number
  attack: number
  release: number
  clampMin: number
  clampMax: number
}

/**
 * Resolve a single target string to paramKey (builtIndex.param) using profile and built node order.
 * Returns null if target format is invalid or no matching built node exists.
 */
export function resolveAnalyserTarget(
  target: string,
  profile: Profile,
  options?: { reducedMotion?: boolean },
): { kind: 'video' | 'audio'; paramKey: string } | null {
  const t = target.trim().toLowerCase()
  if (t.startsWith(VIDEO_PREFIX)) return resolveVideoTarget(t, profile, options)
  if (t.startsWith(AUDIO_PREFIX)) return resolveAudioTarget(t, profile)
  return null
}

function resolveVideoTarget(
  target: string,
  profile: Profile,
  options?: { reducedMotion?: boolean },
): { kind: 'video'; paramKey: string } | null {
  const parsed = parseScopedTarget(target, 'video')
  if (!parsed) return null
  const builtIndex = getBuiltNodeIndex(profile, parsed.nodeId, {
    reducedMotion: options?.reducedMotion,
  })
  return builtIndex === -1 ? null : { kind: 'video', paramKey: `${builtIndex}.${parsed.param}` }
}

function resolveAudioTarget(
  target: string,
  profile: Profile,
): { kind: 'audio'; paramKey: string } | null {
  const parsed = parseScopedTarget(target, 'audio')
  if (!parsed) return null
  const index = (profile.audio_stack?.chain ?? []).findIndex(
    (node) => (node.id ?? node.node ?? '').toLowerCase() === parsed.nodeId,
  )
  return index === -1 ? null : { kind: 'audio', paramKey: `audio.${index}.${parsed.param}` }
}
