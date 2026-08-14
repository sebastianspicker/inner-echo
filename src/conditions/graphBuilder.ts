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
import type { Profile } from './schema'
import { getReducedMotionDisableNodes } from './normalize'
import { logger } from '../utils/logger'
import { shouldSkipNode } from './builtVideoStack'
import { NODE_FACTORY } from './videoNodeFactory'

export { TEMPORAL_NODE_TYPES, profileHasTemporalNodes } from './motionPolicy'
export { NODE_FACTORY } from './videoNodeFactory'
export {
  getBuiltNodeIndex,
  getBuiltVideoStackEntries,
  getProfileEntryForBuiltIndex,
  shouldSkipNode,
  type BuiltVideoStackEntry,
  type BuildVideoNodesOptions,
} from './builtVideoStack'
import type { BuildVideoNodesOptions } from './builtVideoStack'

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
