/**
 * Phase 5/6: Map profile video_stack to engine VideoNode instances.
 * Unknown node types → console.warn + skip (do not crash).
 */

import type { VideoNode } from '../engine/effects/VideoNode'
import {
  GrainNode,
  VignetteNode,
  ChromaticAberrationNode,
  TemporalSmearNode,
  ColorGradeNode,
  HazeNode,
  SoftBlurNode,
  EdgeSharpenNode,
  PulseNode,
  InterferenceNode,
  FocusJitterNode,
  FeedbackLoopNode,
  GridHintNode,
} from '../engine/effects'
import type { Profile, VideoStackNodeDef } from './schema'
import { getReducedMotionDisableNodes } from './normalize'

const NODE_FACTORY: Record<string, () => VideoNode> = {
  grain: () => new GrainNode(),
  vignette: () => new VignetteNode(),
  chromatic_aberration: () => new ChromaticAberrationNode(),
  // SSOT canonical name
  chroma_aberration: () => new ChromaticAberrationNode(),
  temporal_smear: () => new TemporalSmearNode(),
  color_grade: () => new ColorGradeNode(),
  haze: () => new HazeNode(),
  soft_blur: () => new SoftBlurNode(),
  edge_sharpen: () => new EdgeSharpenNode(),
  pulse: () => new PulseNode(),
  interference: () => new InterferenceNode(),
  focus_jitter: () => new FocusJitterNode(),
  feedback_loop: () => new FeedbackLoopNode(),
  grid_hint: () => new GridHintNode(),
}

/** Node types that are temporal/motion-heavy; skipped when Reduced Motion is on. */
export const TEMPORAL_NODE_TYPES = new Set<string>(['temporal_smear'])

export interface BuildVideoNodesOptions {
  /** When true, temporal/strobe-heavy nodes (e.g. temporal_smear) are skipped. */
  reducedMotion?: boolean
}

function shouldSkipNode(
  nodeTypeRaw: unknown,
  reducedMotion: boolean,
  reducedMotionDisable: Set<string>
): boolean {
  const nodeType = typeof nodeTypeRaw === 'string' ? nodeTypeRaw : ''
  if (!nodeType) return true
  const t = nodeType.toLowerCase()
  if (reducedMotion && (TEMPORAL_NODE_TYPES.has(t) || reducedMotionDisable.has(t))) return true
  return false
}

/**
 * Build an array of VideoNodes from a profile's video_stack.
 * Only known node types are instantiated; others are skipped with a warning.
 * Phase 10: When reducedMotion is true, temporal nodes are excluded.
 */
export function buildVideoNodes(
  profile: Profile,
  options?: BuildVideoNodesOptions
): VideoNode[] {
  const reducedMotion = options?.reducedMotion === true
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  const nodes: VideoNode[] = []
  for (const def of profile.video_stack) {
    const nodeType = (def as VideoStackNodeDef).node
    if (!nodeType || typeof nodeType !== 'string') {
      console.warn('[conditions] video_stack entry missing "node":', def)
      continue
    }
    if (shouldSkipNode(nodeType, reducedMotion, reducedMotionDisable)) {
      continue
    }
    const factory = NODE_FACTORY[nodeType]
    if (!factory) {
      console.warn('[conditions] Unknown video node type, skipping:', nodeType)
      continue
    }
    nodes.push(factory())
  }
  return nodes
}

/**
 * Returns true if the profile's video_stack contains any temporal node (e.g. temporal_smear).
 * Used to show a UI hint when Reduced Motion is on and the condition would use such nodes.
 */
export function profileHasTemporalNodes(profile: Profile): boolean {
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  for (const def of profile.video_stack) {
    const nodeType = (def as VideoStackNodeDef).node
    if (!nodeType) continue
    const t = nodeType.toLowerCase()
    if (TEMPORAL_NODE_TYPES.has(t) || reducedMotionDisable.has(t)) return true
  }
  return false
}

/**
 * Phase 8: Index of a node in the *built* array (skipped nodes excluded).
 * Used so analyser_to_params targets resolve to the same paramKey the pipeline uses (nodeIndex.param).
 */
export function getBuiltNodeIndex(
  profile: Profile,
  nodeId: string,
  options?: BuildVideoNodesOptions
): number {
  const id = nodeId.toLowerCase()
  let builtIndex = 0
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  const reducedMotion = options?.reducedMotion === true
  for (const def of profile.video_stack) {
    const nodeType = (def as VideoStackNodeDef).node
    if (!nodeType || typeof nodeType !== 'string') continue
    if (shouldSkipNode(nodeType, reducedMotion, reducedMotionDisable)) continue
    if (!NODE_FACTORY[nodeType]) continue
    const entryId = ((def as VideoStackNodeDef).id ?? nodeType).toLowerCase()
    const entryType = nodeType.toLowerCase()
    // SSOT targets may refer to either stack `id` or node type; accept both.
    if (entryId === id || entryType === id) return builtIndex
    builtIndex++
  }
  return -1
}

/**
 * Phase 8: Profile video_stack entry for a given built index (for reading default params).
 */
export function getProfileEntryForBuiltIndex(
  profile: Profile,
  builtIndex: number,
  options?: BuildVideoNodesOptions
): VideoStackNodeDef | undefined {
  let count = 0
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  const reducedMotion = options?.reducedMotion === true
  for (const def of profile.video_stack) {
    const nodeType = (def as VideoStackNodeDef).node
    if (!nodeType || typeof nodeType !== 'string') continue
    if (shouldSkipNode(nodeType, reducedMotion, reducedMotionDisable)) continue
    if (!NODE_FACTORY[nodeType]) continue
    if (count === builtIndex) return def as VideoStackNodeDef
    count++
  }
  return undefined
}
