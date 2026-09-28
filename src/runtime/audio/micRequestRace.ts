import type { MicStatus } from './types'
import { stopMediaTracks } from './micCleanup'

type MicRequestRaceOptions = {
  canRequest: () => boolean
  isDisposed: () => boolean
  onStatusChange: (status: MicStatus, error?: string) => void
}

export function createMicRequestRace(options: MicRequestRaceOptions) {
  let sequence = 0
  const invalidate = (): void => {
    sequence += 1
  }
  const isCurrent = (request: number): boolean => !options.isDisposed() && request === sequence
  const request = (): Promise<MediaStream | null> => {
    if (!canStartRequest(options)) return Promise.resolve(null)
    const activeRequest = ++sequence
    options.onStatusChange('requesting')
    return requestMediaStream(activeRequest, isCurrent, options)
  }
  return { invalidate, request }
}

function canStartRequest(options: MicRequestRaceOptions): boolean {
  if (!options.canRequest()) {
    reportUnavailable(options)
    return false
  }
  if (!hasUserMedia()) {
    reportUnsupported(options)
    return false
  }
  return true
}

async function requestMediaStream(
  activeRequest: number,
  isCurrent: (request: number) => boolean,
  options: MicRequestRaceOptions,
): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    return acceptCurrentStream(stream, activeRequest, isCurrent)
  } catch (error) {
    reportRequestFailure(error, activeRequest, isCurrent, options)
    return null
  }
}

function acceptCurrentStream(
  stream: MediaStream,
  activeRequest: number,
  isCurrent: (request: number) => boolean,
): MediaStream | null {
  if (isCurrent(activeRequest)) return stream
  stopMediaTracks(stream)
  return null
}

function reportRequestFailure(
  error: unknown,
  activeRequest: number,
  isCurrent: (request: number) => boolean,
  options: MicRequestRaceOptions,
): void {
  if (!isCurrent(activeRequest)) return
  options.onStatusChange(isPermissionDenied(error) ? 'denied' : 'error', errorMessage(error))
}

function reportUnavailable(options: MicRequestRaceOptions): null {
  options.onStatusChange('error', 'Audio not ready')
  return null
}

function reportUnsupported(options: MicRequestRaceOptions): null {
  options.onStatusChange('error', 'Microphone access is not supported in this browser.')
  return null
}

function hasUserMedia(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

function isPermissionDenied(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
