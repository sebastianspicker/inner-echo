/**
 * Camera permission/runtime state used by the UI.
 * WebGL and audio state are tracked separately so a denied camera request does
 * not imply anything about audio or overlay lifecycle.
 */
export type CameraState = 'idle' | 'requesting' | 'active' | 'denied' | 'error'

export interface CameraError {
  code: string
  message: string
}
