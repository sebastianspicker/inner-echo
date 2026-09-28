import { profileHasTemporalNodes } from '../../../domain/experience/motionPolicy'
import type { CatalogEntry, Profile } from '../../../domain/experience/schema'
import { getBuiltVideoStackEntries } from '../../../domain/experience/videoStack'
import type { SelectedPreset } from '../../../domain/experience/composition/types'
import { IMPLEMENTED_VIDEO_NODES } from '../../../runtime/capabilities'
import type { CameraState, OverlayRuntimeState } from '../../../runtime/session'
import type { ExperienceSettings } from './settings'

export const DEFAULT_PICKER_OPTIONS: CatalogEntry[] = [
  { id: 'none', label: 'None (Clean)', description: 'No overlay. Baseline camera view.' },
  {
    id: 'anxiety',
    label: 'Anxiety',
    description: 'Metaphor of heightened tension; grain overlay.',
  },
]

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

export interface WorkspacePresentationCamera {
  cameraState: CameraState
  overlayState: OverlayRuntimeState
}

function effectsLabel(camera: WorkspacePresentationCamera): string {
  const { cameraState, overlayState } = camera
  if (cameraState !== 'active') return 'Off'
  if (overlayState.effectsActive) return 'Active'
  if (overlayState.rendererMode === 'webgl') return 'Clean preview'
  if (overlayState.rendererMode === '2d' || overlayState.rendererMode === 'raw') {
    return 'Raw preview'
  }
  return 'Unavailable'
}

export function deriveWorkspacePresentation(
  settings: ExperienceSettings,
  profile: Profile | null,
  camera: WorkspacePresentationCamera,
) {
  const warnings = profile?.safety?.warnings ?? []
  const showReducedMotionHint =
    settings.reducedMotion && profile != null && profileHasTemporalNodes(profile)
  const profileDefinesReducedMotionControl = (profile?.ui?.controls ?? []).some(
    (control) => control.id === 'reduced_motion',
  )
  return {
    warnings,
    showReducedMotionHint,
    profileDefinesReducedMotionControl,
    effectsLabel: effectsLabel(camera),
    activeVideoNodeIds: getActiveVideoNodeIds(profile, settings.reducedMotion),
  }
}
