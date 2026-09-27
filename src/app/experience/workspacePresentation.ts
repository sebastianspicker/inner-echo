import type { CatalogEntry, Profile } from '../../domain/experience/schema'
import { getBuiltVideoStackEntries } from '../../domain/experience/videoStack'
import { IMPLEMENTED_VIDEO_NODES } from '../../runtime/capabilities'
import type { SelectedPreset } from '../../domain/experience/composition/types'

export const DEFAULT_PICKER_OPTIONS: CatalogEntry[] = [
  { id: 'none', label: 'None (Clean)', description: 'No overlay. Baseline camera view.' },
  {
    id: 'anxiety',
    label: 'Anxiety',
    description: 'Metaphor of heightened tension; grain overlay.',
  },
]

export const DEFAULT_INTENSITY = 0.5
export const DEFAULT_CONDITION_ID = 'none'
export const DEBUG_UI_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_INNER_ECHO_DEBUG_UI === 'true'

export function getActiveVideoNodeIds(profile: Profile | null, reducedMotion: boolean): string[] {
  if (!profile) return []
  return getBuiltVideoStackEntries(profile, {
    reducedMotion,
    supportedNodeIds: IMPLEMENTED_VIDEO_NODES,
  }).map((entry) => entry.def.node.toLowerCase())
}

export function seedPresetStack(previous: SelectedPreset[], conditionId: string): SelectedPreset[] {
  if (previous.length > 0) return previous
  return conditionId && conditionId !== 'none' ? [{ profileId: conditionId, weight: 1 }] : []
}
