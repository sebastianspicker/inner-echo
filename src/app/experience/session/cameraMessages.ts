/**
 * User-facing camera status and error messages.
 * Messages identify the failure and give a concrete recovery action.
 */

import type { CameraState } from '../../../runtime/camera'

const STATE_LABELS: Record<CameraState, string> = {
  idle: 'Ready',
  requesting: 'Requesting access\u2026',
  active: 'Active',
  denied: 'Permission needed',
  error: 'Camera error',
}

const CAMERA_ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError:
    'It looks like camera access was not granted. That is completely okay. If you would like to try again, you can allow camera access in your browser settings, then reload the page.',
  PermissionDeniedError:
    'It looks like camera access was not granted. That is completely okay. If you would like to try again, you can allow camera access in your browser settings, then reload the page.',
  NotFoundError:
    'We could not find a camera on this device. If you have an external camera, please make sure it is connected and try again.',
  NotReadableError:
    'Your camera may be in use by another application. Try closing other apps that use the camera, then come back here.',
  OverconstrainedError:
    'The requested camera settings are not supported by your device. The experience will still work with default settings.',
  AbortError: 'Camera access was interrupted. Check the device connection, then try again.',
  NotSupportedError:
    'Camera access is not available in this browser. Try a current version of Chrome, Firefox, or Safari.',
}

export function getCameraStateLabel(state: CameraState): string {
  return STATE_LABELS[state]
}

/**
 * Map DOMException from getUserMedia to a short, empathetic user-facing message.
 */
export function getCameraErrorMessage(error: DOMException): string {
  const knownMessage = CAMERA_ERROR_MESSAGES[error.name]
  if (knownMessage) return knownMessage
  return error.message
    ? `Something unexpected happened with the camera: ${error.message}. You can try again at any time.`
    : 'Something unexpected happened. You are welcome to try again whenever you are ready.'
}
