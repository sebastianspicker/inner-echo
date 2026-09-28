/**
 * Public facade for the framework-free experience session. This is the only module app
 * code should import for camera, sound, microphone, and overlay lifecycle plus the
 * runtime types that describe their state.
 */
export { createExperienceSession } from './session'
export type {
  CameraIssue,
  ExperienceSession,
  LiveSettings,
  SessionDependencies,
  SessionDiagnostics,
  SessionSnapshot,
  StageElements,
} from './types'

export type { CameraState } from '../camera'
export type {
  AudioContextStatus,
  AudioEngineDebugState,
  AudioInputMode,
  AudioMetrics,
  MicStatus,
} from '../audio'
export type {
  OverlayDiagnostics,
  OverlayRendererMode,
  OverlayRuntimeState,
  VideoMetrics,
} from '../visual/overlay'
