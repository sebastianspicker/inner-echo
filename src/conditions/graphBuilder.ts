/**
 * Condition Graph Builder
 *
 * This module bridges the gap between the static JSON profiles and the live WebGL/Audio engines.
 * Its main job is to read the `video_stack` array from a profile and instantiate the
 * correct TypeScript `VideoNode` objects (e.g. turning `"node": "grain"` in JSON into `new GrainNode()`).
 *
 * Architecture note: This module lives in conditions/ but imports from engine/effects/.
 * This cross-layer dependency is intentional: graphBuilder is the bridge that translates
 * condition profile data into live engine node instances. The dependency direction
 * (conditions → engine) is correct: profiles declare what to build, this module
 * instantiates how. Moving NODE_FACTORY to engine/ would invert the dependency
 * without simplifying the architecture, since buildVideoNodes needs profile types.
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
  GazeTunnelNode,
  SomaticPulseNode,
  IntrusionBurstNode,
  SalienceCompetitionNode,
  GlassVeilNode,
} from '../engine/effects'
import type { Profile, VideoStackNodeDef } from './schema'
import { getReducedMotionDisableNodes } from './normalize'
import { TEMPORAL_NODE_TYPES } from './motionPolicy'
import { logger } from '../utils/logger'

export { TEMPORAL_NODE_TYPES, profileHasTemporalNodes } from './motionPolicy'

export const NODE_FACTORY: Record<string, () => VideoNode> = {
  grain: () => new GrainNode(),
  vignette: () => new VignetteNode(),
  chromatic_aberration: () => new ChromaticAberrationNode(),
  // Canonical profile name.
  // Legacy alias: some profiles and dimension mappings use "chroma_aberration" as a short form.
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
  gaze_tunnel: () => new GazeTunnelNode(),
  somatic_pulse: () => new SomaticPulseNode(),
  intrusion_burst: () => new IntrusionBurstNode(),
  salience_competition: () => new SalienceCompetitionNode(),
  glass_veil: () => new GlassVeilNode(),
}

/** Node types that are temporal/motion-heavy; skipped when Reduced Motion is on. */
export interface BuildVideoNodesOptions {
  /** When true, temporal/strobe-heavy nodes (e.g. temporal_smear) are skipped. */
  reducedMotion?: boolean
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
  const t = nodeType.toLowerCase()
  if (reducedMotion && (TEMPORAL_NODE_TYPES.has(t) || reducedMotionDisable.has(t))) return true
  return false
}

/** Resolve the profile entries that map to built pipeline indices. */
export function getBuiltVideoStackEntries(
  profile: Profile,
  options?: BuildVideoNodesOptions,
): BuiltVideoStackEntry[] {
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  const reducedMotion = options?.reducedMotion === true
  return profile.video_stack.reduce<BuiltVideoStackEntry[]>((entries, def) => {
    const nodeType = def.node
    if (
      nodeType &&
      typeof nodeType === 'string' &&
      !shouldSkipNode(nodeType, reducedMotion, reducedMotionDisable) &&
      NODE_FACTORY[nodeType.toLowerCase()]
    ) {
      entries.push({ def, index: entries.length })
    }
    return entries
  }, [])
}

/**
 * Builds an array of live `VideoNode` objects based on a profile's `video_stack` definition.
 *
 * - Only known node types (listed in `NODE_FACTORY`) are instantiated.
 * - Unknown types are logged to the console and safely skipped.
 * - If `options.reducedMotion` is true, temporal/strobe-heavy nodes are skipped.
 *
 * @param profile The parsed active condition profile.
 * @param options Accessibility options like Reduced Motion.
 * @returns Array of instantiated VideoNodes ready for the WebGL pipeline.
 */
export function buildVideoNodes(profile: Profile, options?: BuildVideoNodesOptions): VideoNode[] {
  const reducedMotion = options?.reducedMotion === true
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  const nodes: VideoNode[] = []
  for (const def of profile.video_stack) {
    const nodeType = def.node
    if (!nodeType || typeof nodeType !== 'string') {
      logger.warn('[conditions] video_stack entry missing "node":', def)
      continue
    }
    if (shouldSkipNode(nodeType, reducedMotion, reducedMotionDisable)) {
      continue
    }
    const factory = NODE_FACTORY[nodeType.toLowerCase()]
    if (!factory) {
      logger.warn('[conditions] Unknown video node type, skipping:', nodeType)
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
/**
 * Index of a node in the built array (skipped nodes excluded).
 * Used so analyser_to_params targets resolve to the same paramKey the pipeline uses (nodeIndex.param).
 */
export function getBuiltNodeIndex(
  profile: Profile,
  nodeId: string,
  options?: BuildVideoNodesOptions,
): number {
  const id = nodeId.toLowerCase()
  const builtEntries = getBuiltVideoStackEntries(profile, options)

  // First pass: prefer an exact match on the explicit `id` field.
  const exactMatch = builtEntries.find((entry) => (entry.def.id ?? '').toLowerCase() === id)
  if (exactMatch?.def.id) return exactMatch.index

  // Second pass: fall back to matching by node type when no id match was found.
  return builtEntries.find((entry) => entry.def.node.toLowerCase() === id)?.index ?? -1
}

/**
 * Profile video_stack entry for a given built index (for reading default params).
 */
export function getProfileEntryForBuiltIndex(
  profile: Profile,
  builtIndex: number,
  options?: BuildVideoNodesOptions,
): VideoStackNodeDef | undefined {
  return getBuiltVideoStackEntries(profile, options)[builtIndex]?.def
}
