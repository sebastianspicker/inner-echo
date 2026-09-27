import type { Profile } from './schema'
import { getReducedMotionDisableNodes } from './safety'
import { shouldSkipNode } from './videoStack'

export { TEMPORAL_NODE_TYPES } from './videoStack'

export function profileHasTemporalNodes(profile: Profile): boolean {
  const disabled = getReducedMotionDisableNodes(profile)
  return profile.video_stack.some((definition) => shouldSkipNode(definition.node, true, disabled))
}
