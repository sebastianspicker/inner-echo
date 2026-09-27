import { profileHasTemporalNodes } from '../../../domain/experience/motionPolicy'
import type { Profile } from '../../../domain/experience/schema'
import type { CameraState, OverlayRuntimeState } from '../../../runtime/session'
import { getActiveVideoNodeIds } from '../workspacePresentation'
import type { WorkspaceState } from './workspaceState'

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
  state: WorkspaceState,
  profile: Profile | null,
  camera: WorkspacePresentationCamera,
) {
  const warnings = profile?.safety?.warnings ?? []
  const showReducedMotionHint =
    state.safety.reducedMotion && profile != null && profileHasTemporalNodes(profile)
  const profileDefinesReducedMotionControl = (profile?.ui?.controls ?? []).some(
    (control) => control.id === 'reduced_motion',
  )
  return {
    warnings,
    showReducedMotionHint,
    profileDefinesReducedMotionControl,
    effectsLabel: effectsLabel(camera),
    activeVideoNodeIds: getActiveVideoNodeIds(profile, state.safety.reducedMotion),
  }
}
