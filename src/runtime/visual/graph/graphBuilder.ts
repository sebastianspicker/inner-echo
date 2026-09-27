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
import { getBuiltVideoStackEntries, shouldSkipNode } from '../../../domain/experience/videoStack'
import { NODE_FACTORY } from './videoNodeFactory'

export { NODE_FACTORY } from './videoNodeFactory'
import type { BuildVideoNodesOptions } from '../../../domain/experience/videoStack'

/** Logs diagnostics for video_stack entries the domain addressing rule would not build. */
function logSkippedVideoStackEntries(
  profile: Profile,
  reducedMotion: boolean,
  reducedMotionDisable: Set<string>,
  supportedNodeIds: ReadonlySet<string>,
): void {
  for (const def of profile.video_stack) {
    const nodeType = def.node
    if (!nodeType || typeof nodeType !== 'string') {
      logger.warn('[visual-graph] video_stack entry missing "node":', def)
      continue
    }
    if (shouldSkipNode(nodeType, reducedMotion, reducedMotionDisable)) continue
    if (!supportedNodeIds.has(nodeType.toLowerCase())) {
      logger.warn('[visual-graph] Unknown video node type, skipping:', nodeType)
    }
  }
}

/**
 * Builds an array of live `VideoNode` objects based on a profile's `video_stack` definition.
 *
 * - Only known node types (listed in `NODE_FACTORY`) are instantiated.
 * - Unknown types are logged to the console and safely skipped.
 * - If `options.reducedMotion` is true, temporal/strobe-heavy nodes are skipped.
 * - Which entries are built (and at which index) is the domain addressing rule in
 *   `domain/experience/videoStack.ts`; this boundary only instantiates them.
 *
 * @param profile The parsed active experience profile.
 * @param options Accessibility options like Reduced Motion.
 * @returns Array of instantiated VideoNodes ready for the WebGL pipeline.
 */
export function buildVideoNodes(profile: Profile, options: BuildVideoNodesOptions): VideoNode[] {
  logSkippedVideoStackEntries(
    profile,
    options?.reducedMotion === true,
    getReducedMotionDisableNodes(profile),
    options.supportedNodeIds,
  )
  const nodes: VideoNode[] = []
  for (const entry of getBuiltVideoStackEntries(profile, options)) {
    const factory = NODE_FACTORY[entry.def.node.toLowerCase()]
    if (factory) nodes.push(factory())
  }
  return nodes
}
