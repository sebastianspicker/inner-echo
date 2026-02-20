/**
 * User-facing camera status and error messages (German).
 */

import type { CameraState } from '../engine/video'

const STATE_LABELS: Record<CameraState, string> = {
  idle: 'Kamera aus',
  requesting: 'Kamera wird angefordert …',
  active: 'Kamera läuft',
  denied: 'Zugriff verweigert',
  error: 'Fehler',
}

export function getCameraStateLabel(state: CameraState): string {
  return STATE_LABELS[state]
}

/**
 * Map DOMException from getUserMedia to a short, user-friendly German message.
 */
export function getCameraErrorMessage(error: DOMException): string {
  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Kamerazugriff wurde abgelehnt. Bitte erlauben Sie den Zugriff in den Browsereinstellungen oder beim Abfrage-Dialog. Seite neu laden und erneut versuchen, oder Berechtigung in den Browsereinstellungen prüfen.'
    case 'NotFoundError':
      return 'Keine Kamera gefunden. Bitte prüfen Sie, ob eine Kamera angeschlossen und freigegeben ist.'
    case 'NotReadableError':
      return 'Kamera wird bereits von einer anderen Anwendung genutzt oder antwortet nicht.'
    case 'OverconstrainedError':
      return 'Die gewünschten Kameraeinstellungen werden nicht unterstützt.'
    case 'AbortError':
      return 'Kamerazugriff wurde abgebrochen.'
    case 'NotSupportedError':
      return 'Kamerazugriff wird in diesem Browser nicht unterstützt.'
    default:
      return error.message
        ? `Kamerafehler: ${error.message}`
        : 'Ein unbekannter Fehler ist aufgetreten.'
  }
}
