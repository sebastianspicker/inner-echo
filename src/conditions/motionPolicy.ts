import type { Profile } from './schema'
import { getReducedMotionDisableNodes } from './normalize'

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

export function profileHasTemporalNodes(profile: Profile): boolean {
  const disabled = getReducedMotionDisableNodes(profile)
  return profile.video_stack.some((definition) => {
    const nodeType = String(definition.node ?? '').toLowerCase()
    return TEMPORAL_NODE_TYPES.has(nodeType) || disabled.has(nodeType)
  })
}
