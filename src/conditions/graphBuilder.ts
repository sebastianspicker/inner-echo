/**
 * Condition Graph Builder
 *
 * This module bridges the gap between the static JSON profiles and the live WebGL/Audio engines.
 * Its main job is to read the `video_stack` array from a profile and instantiate the
 * correct TypeScript `VideoNode` objects (e.g. turning `"node": "grain"` in JSON into `new GrainNode()`).
 *
 * Architecture note: This module lives in conditions/ but imports from engine/effects/.
 * This cross-layer dependency is intentional — graphBuilder is the bridge that translates
 * condition profile data into live engine node instances. The dependency direction
 * (conditions → engine) is correct: profiles declare *what* to build, this module
 * instantiates *how*. Moving NODE_FACTORY to engine/ would invert the dependency
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
import { logger } from '../utils/logger'

export const NODE_FACTORY: Record<string, () => VideoNode> = {
  grain: () => new GrainNode(),
  vignette: () => new VignetteNode(),
  chromatic_aberration: () => new ChromaticAberrationNode(),
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

const LEGACY_NODE_ALIASES: Record<string, string> = { chroma_aberration: 'chromatic_aberration' }
let warnedLegacyChromaAlias = false

/** Normalizes external profile input; the legacy alias is removed in 0.2.0. */
export function normalizeVideoNodeName(nodeType: string): string {
  const normalized = nodeType.toLowerCase()
  const canonical = LEGACY_NODE_ALIASES[normalized]
  if (canonical && !warnedLegacyChromaAlias) {
    warnedLegacyChromaAlias = true
    logger.warn(
      '[conditions] "chroma_aberration" is deprecated and will be removed in 0.2.0; use "chromatic_aberration".',
    )
  }
  return canonical ?? normalized
}

/** Node types that are temporal/motion-heavy; skipped when Reduced Motion is on. */
export const TEMPORAL_NODE_TYPES = new Set<string>([
  'temporal_smear',
  'feedback_loop',
  'pulse',
  'focus_jitter',
  'somatic_pulse',
  'intrusion_burst',
  'salience_competition',
  'glass_veil',
])

export interface BuildVideoNodesOptions {
  /** When true, temporal/strobe-heavy nodes (e.g. temporal_smear) are skipped. */
  reducedMotion?: boolean
}

export function shouldSkipNode(
  nodeTypeRaw: unknown,
  reducedMotion: boolean,
  reducedMotionDisable: Set<string>,
): boolean {
  const nodeType = typeof nodeTypeRaw === 'string' ? nodeTypeRaw : ''
  if (!nodeType) return true
  const t = normalizeVideoNodeName(nodeType)
  if (reducedMotion && (TEMPORAL_NODE_TYPES.has(t) || reducedMotionDisable.has(t))) return true
  return false
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
    const factory = NODE_FACTORY[normalizeVideoNodeName(nodeType)]
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
export function profileHasTemporalNodes(profile: Profile): boolean {
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  for (const def of profile.video_stack) {
    const nodeType = def.node
    if (!nodeType) continue
    const t = normalizeVideoNodeName(nodeType)
    if (TEMPORAL_NODE_TYPES.has(t) || reducedMotionDisable.has(t)) return true
  }
  return false
}

function isBuildableNode(
  def: VideoStackNodeDef,
  reducedMotion: boolean,
  reducedMotionDisable: Set<string>,
): boolean {
  const nodeType = def.node
  return Boolean(
    nodeType &&
      typeof nodeType === 'string' &&
      !shouldSkipNode(nodeType, reducedMotion, reducedMotionDisable) &&
      NODE_FACTORY[normalizeVideoNodeName(nodeType)],
  )
}

function findBuiltNodeIndex(
  profile: Profile,
  id: string,
  reducedMotion: boolean,
  reducedMotionDisable: Set<string>,
  match: (def: VideoStackNodeDef, normalizedId: string) => boolean,
): number {
  let builtIndex = 0
  for (const def of profile.video_stack) {
    if (!isBuildableNode(def, reducedMotion, reducedMotionDisable)) continue
    if (match(def, id)) return builtIndex
    builtIndex++
  }
  return -1
}

/**
 * Index of a node in the *built* array (skipped nodes excluded).
 * Used so analyser_to_params targets resolve to the same paramKey the pipeline uses (nodeIndex.param).
 */
export function getBuiltNodeIndex(
  profile: Profile,
  nodeId: string,
  options?: BuildVideoNodesOptions,
): number {
  const id = normalizeVideoNodeName(nodeId)
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  const reducedMotion = options?.reducedMotion === true

  // First pass: prefer an exact match on the explicit `id` field.
  const explicitMatch = findBuiltNodeIndex(
    profile,
    id,
    reducedMotion,
    reducedMotionDisable,
    (def, normalizedId) => Boolean(def.id && def.id.toLowerCase() === normalizedId),
  )
  if (explicitMatch !== -1) return explicitMatch

  // Second pass: fall back to matching by node type when no id match was found.
  return findBuiltNodeIndex(
    profile,
    id,
    reducedMotion,
    reducedMotionDisable,
    (def, normalizedId) => normalizeVideoNodeName(def.node) === normalizedId,
  )
}

/**
 * Profile video_stack entry for a given built index (for reading default params).
 */
export function getProfileEntryForBuiltIndex(
  profile: Profile,
  builtIndex: number,
  options?: BuildVideoNodesOptions,
): VideoStackNodeDef | undefined {
  let count = 0
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  const reducedMotion = options?.reducedMotion === true
  for (const def of profile.video_stack) {
    const nodeType = def.node
    if (!nodeType || typeof nodeType !== 'string') continue
    if (shouldSkipNode(nodeType, reducedMotion, reducedMotionDisable)) continue
    if (!NODE_FACTORY[normalizeVideoNodeName(nodeType)]) continue
    if (count === builtIndex) return def
    count++
  }
  return undefined
}
