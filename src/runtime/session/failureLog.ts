/**
 * One console line per failure or fallback transition, so tester bug reports have something to
 * quote from a production build. Lines carry only states and error names: never error messages,
 * device labels, stream details, or settings.
 */
import { logger } from '../../platform/logger'
import type { SessionSnapshot } from './types'

function cameraLine({ camera, cameraIssue }: SessionSnapshot): string | null {
  if (camera !== 'denied' && camera !== 'error') return null
  const cause = cameraIssue?.kind === 'request-failed' ? cameraIssue.name : cameraIssue?.kind
  return cause ? `camera ${camera} (${cause})` : `camera ${camera}`
}

function failureLines(snapshot: SessionSnapshot): string[] {
  const { overlay } = snapshot
  return [
    cameraLine(snapshot),
    overlay.error ? `visual renderer ${overlay.rendererMode} after ${overlay.error.name}` : null,
    snapshot.soundError ? `sound ${snapshot.sound} after a start failure` : null,
    snapshot.micError ? `microphone ${snapshot.mic}` : null,
  ].filter((line): line is string => line !== null)
}

export function createFailureLog(): (snapshot: SessionSnapshot) => void {
  let previous = new Set<string>()
  return (snapshot) => {
    const current = new Set(failureLines(snapshot))
    for (const line of current) if (!previous.has(line)) logger.error(line)
    previous = current
  }
}
