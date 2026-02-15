/**
 * Phase 8: Resolve profile reactive.analyser_to_params targets to pipeline param keys.
 * Target format: "video.<nodeId>.<param>" → paramKey "builtIndex.param".
 * Uses built-node index (skipped nodes excluded) so keys match what the pipeline passes to nodes.
 * Unknown targets log a warning and are skipped (no crash).
 */

import type { Profile } from '../../conditions/schema'
import { getBuiltNodeIndex } from '../../conditions/graphBuilder'

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
  options?: { reducedMotion?: boolean }
): { kind: 'video' | 'audio'; paramKey: string } | null {
  const t = target.trim().toLowerCase()
  if (t.startsWith(VIDEO_PREFIX)) {
    const rest = t.slice(VIDEO_PREFIX.length)
    const dot = rest.indexOf('.')
    if (dot === -1) return null
    const nodeId = rest.slice(0, dot)
    const param = rest.slice(dot + 1)
    if (!param) return null
    const builtIndex = getBuiltNodeIndex(profile, nodeId, { reducedMotion: options?.reducedMotion })
    if (builtIndex === -1) return null
    return { kind: 'video', paramKey: `${builtIndex}.${param}` }
  }

  if (t.startsWith(AUDIO_PREFIX)) {
    // Resolve by audio_stack.chain index: "audio.<nodeId>.<param>" -> "audio.<chainIndex>.<param>"
    const rest = t.slice(AUDIO_PREFIX.length)
    const dot = rest.indexOf('.')
    if (dot === -1) return null
    const nodeId = rest.slice(0, dot)
    const param = rest.slice(dot + 1)
    if (!param) return null
    const chain = (profile as { audio_stack?: { chain?: Array<{ id?: string; node: string }> } })
      .audio_stack?.chain ?? []
    const idx = chain.findIndex((n) => ((n.id ?? n.node) ?? '').toLowerCase() === nodeId)
    if (idx === -1) return null
    return { kind: 'audio', paramKey: `audio.${idx}.${param}` }
  }

  return null
}
