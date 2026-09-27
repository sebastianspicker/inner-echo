/**
 * User-facing camera and sound status/error messages.
 * Messages identify the failure and give a concrete recovery action.
 * The runtime session reports CameraIssue/status facts only; this module maps them to copy.
 */

import type { AudioContextStatus, CameraIssue, CameraState } from '../../../runtime/session'

export const CAMERA_STREAM_INTERRUPTED_MESSAGE =
  'The camera connection was briefly interrupted. You can restart it whenever you are ready.'
export const CAMERA_DEVICE_DISCONNECTED_MESSAGE =
  'It seems your camera was disconnected. Please reconnect it and start again when you are ready.'
const CAMERA_PLAYBACK_FAILED_MESSAGE =
  'The camera could not start playback. Please try clicking anywhere on the page and then restarting the camera.'

const STATE_LABELS: Record<CameraState, string> = {
  idle: 'Ready',
  requesting: 'Requesting access…',
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
 * Map a getUserMedia error name/message to a short, empathetic user-facing message.
 */
export function getCameraErrorMessage(error: Pick<DOMException, 'name' | 'message'>): string {
  const knownMessage = CAMERA_ERROR_MESSAGES[error.name]
  if (knownMessage) return knownMessage
  return error.message
    ? `Something unexpected happened with the camera: ${error.message}. You can try again at any time.`
    : 'Something unexpected happened. You are welcome to try again whenever you are ready.'
}

/** Maps a runtime CameraIssue fact to the user-facing copy shown in the workspace. */
export function getCameraIssueMessage(issue: CameraIssue | null): string | null {
  if (!issue) return null
  if (issue.kind === 'request-failed') return getCameraErrorMessage(issue)
  if (issue.kind === 'playback-failed') return CAMERA_PLAYBACK_FAILED_MESSAGE
  if (issue.kind === 'interrupted') return CAMERA_STREAM_INTERRUPTED_MESSAGE
  return CAMERA_DEVICE_DISCONNECTED_MESSAGE
}

export function getAudioStateLabel(
  status: AudioContextStatus,
  conditionAudioEnabled: boolean,
): string {
  if (status === 'on') return conditionAudioEnabled ? 'on' : 'muted (engine on)'
  if (status === 'starting') return 'starting…'
  return status
}
