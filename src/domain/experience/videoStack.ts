import type { Profile, VideoStackNodeDef } from './schema'
import { getReducedMotionDisableNodes } from './safety'
import { TEMPORAL_NODE_TYPES } from './motionPolicy'

export interface BuildVideoNodesOptions {
  /** When true, temporal/strobe-heavy nodes (e.g. temporal_smear) are skipped. */
  reducedMotion?: boolean
  /** Runtime-supported node ids injected at the domain/runtime boundary. */
  supportedNodeIds: ReadonlySet<string>
}

export interface BuiltVideoStackEntry {
  def: VideoStackNodeDef
  index: number
}

export function shouldSkipNode(
  nodeTypeRaw: unknown,
  reducedMotion: boolean,
  reducedMotionDisable: Set<string>,
): boolean {
  const nodeType = typeof nodeTypeRaw === 'string' ? nodeTypeRaw : ''
  if (!nodeType) return true
  const normalizedNodeType = nodeType.toLowerCase()
  return (
    reducedMotion &&
    (TEMPORAL_NODE_TYPES.has(normalizedNodeType) || reducedMotionDisable.has(normalizedNodeType))
  )
}

function isBuiltVideoStackNode(
  nodeType: unknown,
  reducedMotion: boolean,
  reducedMotionDisable: Set<string>,
  supportedNodeIds: ReadonlySet<string>,
): nodeType is string {
  return (
    typeof nodeType === 'string' &&
    !shouldSkipNode(nodeType, reducedMotion, reducedMotionDisable) &&
    supportedNodeIds.has(nodeType.toLowerCase())
  )
}

/** Resolve the profile entries that map to built pipeline indices. */
export function getBuiltVideoStackEntries(
  profile: Profile,
  options: BuildVideoNodesOptions,
): BuiltVideoStackEntry[] {
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  const reducedMotion = options?.reducedMotion === true
  return profile.video_stack.reduce<BuiltVideoStackEntry[]>((entries, def) => {
    if (
      isBuiltVideoStackNode(def.node, reducedMotion, reducedMotionDisable, options.supportedNodeIds)
    ) {
      entries.push({ def, index: entries.length })
    }
    return entries
  }, [])
}

/**
 * Index of a node in the built array (skipped nodes excluded).
 * Used so analyser_to_params targets resolve to the same paramKey the pipeline uses (nodeIndex.param).
 */
export function getBuiltNodeIndex(
  profile: Profile,
  nodeId: string,
  options: BuildVideoNodesOptions,
): number {
  const id = nodeId.toLowerCase()
  const builtEntries = getBuiltVideoStackEntries(profile, options)

  // First pass: prefer an exact match on the explicit `id` field.
  const exactMatch = builtEntries.find((entry) => (entry.def.id ?? '').toLowerCase() === id)
  if (exactMatch?.def.id) return exactMatch.index

  // Second pass: fall back to matching by node type when no id match was found.
  return builtEntries.find((entry) => entry.def.node.toLowerCase() === id)?.index ?? -1
}

/** Profile video_stack entry for a given built index (for reading default params). */
export function getProfileEntryForBuiltIndex(
  profile: Profile,
  builtIndex: number,
  options: BuildVideoNodesOptions,
): VideoStackNodeDef | undefined {
  return getBuiltVideoStackEntries(profile, options)[builtIndex]?.def
}
