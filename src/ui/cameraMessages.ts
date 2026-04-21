/**
 * User-facing camera status and error messages.
 * Language is kept warm and reassuring for a therapeutic context.
 */

import type { CameraState } from '../engine/video'

const STATE_LABELS: Record<CameraState, string> = {
  idle: 'Ready',
  requesting: 'Requesting access\u2026',
  active: 'Active',
  denied: 'Permission needed',
  error: 'Paused',
}

export function getCameraStateLabel(state: CameraState): string {
  return STATE_LABELS[state]
}

/**
 * Map DOMException from getUserMedia to a short, empathetic user-facing message.
 */
export function getCameraErrorMessage(error: DOMException): string {
  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'It looks like camera access was not granted. That is completely okay. If you would like to try again, you can allow camera access in your browser settings, then reload the page.'
    case 'NotFoundError':
      return 'We could not find a camera on this device. If you have an external camera, please make sure it is connected and try again.'
    case 'NotReadableError':
      return 'Your camera may be in use by another application. Try closing other apps that use the camera, then come back here.'
    case 'OverconstrainedError':
      return 'The requested camera settings are not supported by your device. The experience will still work with default settings.'
    case 'AbortError':
      return 'Camera access was interrupted. You can try again whenever you feel ready.'
    case 'NotSupportedError':
      return 'Camera access is not available in this browser. For the best experience, try a recent version of Chrome, Firefox, or Safari.'
    default:
      return error.message
        ? `Something unexpected happened with the camera: ${error.message}. You can try again at any time.`
        : 'Something unexpected happened. You are welcome to try again whenever you are ready.'
  }
}
