/**
 * Camera UI state for Phase 1 (minimal video path).
 * No WebGL/Canvas in this phase.
 */
export type CameraState =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'error'

export interface CameraError {
  code: string
  message: string
}
