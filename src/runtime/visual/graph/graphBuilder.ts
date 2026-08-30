/**
 * Runtime video graph builder.
 *
 * Declarative profile entries remain domain data. This runtime boundary is the only place
 * where those entries become executable `VideoNode` instances.
 */

import type { VideoNode } from '../effects/VideoNode'
import type { Profile } from '../../../domain/experience/schema'
import { getReducedMotionDisableNodes } from '../../../domain/experience/safety'
import { logger } from '../../../platform/logger'
import { shouldSkipNode } from '../../../domain/experience/videoStack'
import { NODE_FACTORY } from './videoNodeFactory'

export { NODE_FACTORY } from './videoNodeFactory'
import type { BuildVideoNodesOptions } from '../../../domain/experience/videoStack'

/**
 * Builds an array of live `VideoNode` objects based on a profile's `video_stack` definition.
 *
 * - Only known node types (listed in `NODE_FACTORY`) are instantiated.
 * - Unknown types are logged to the console and safely skipped.
 * - If `options.reducedMotion` is true, temporal/strobe-heavy nodes are skipped.
 *
 * @param profile The parsed active experience profile.
 * @param options Accessibility options like Reduced Motion.
 * @returns Array of instantiated VideoNodes ready for the WebGL pipeline.
 */
export function buildVideoNodes(profile: Profile, options: BuildVideoNodesOptions): VideoNode[] {
  const reducedMotion = options?.reducedMotion === true
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  const nodes: VideoNode[] = []
  for (const def of profile.video_stack) {
    const nodeType = def.node
    if (!nodeType || typeof nodeType !== 'string') {
      logger.warn('[visual-graph] video_stack entry missing "node":', def)
      continue
    }
    if (shouldSkipNode(nodeType, reducedMotion, reducedMotionDisable)) {
      continue
    }
    const factory = options.supportedNodeIds.has(nodeType.toLowerCase())
      ? NODE_FACTORY[nodeType.toLowerCase()]
      : undefined
    if (!factory) {
      logger.warn('[visual-graph] Unknown video node type, skipping:', nodeType)
      continue
    }
    nodes.push(factory())
  }
  return nodes
}
