/**
 * Camera stream lifecycle: request, attach to the stage video element, and monitor for
 * interruption or device disconnection. Reports CameraState/CameraIssue facts only; the
 * app maps issues to user-facing copy (see src/app/experience/media/mediaMessages.ts).
 */
import { logger } from '../../platform/logger'
import { requestVideoStream as defaultRequestVideoStream, stopVideoStream } from '../camera'
import type { CameraState } from '../camera'
import type { CameraIssue } from './types'

const HEALTH_POLL_MS = 250

function hasLiveVideoTrack(stream: MediaStream): boolean {
  return stream.getVideoTracks().some((track) => track.readyState === 'live')
}

function clearVideoTrackEndHandlers(stream: MediaStream | null): void {
  if (!stream) return
  for (const track of stream.getVideoTracks()) track.onended = null
}

export interface CameraManagerDeps {
  requestVideoStream?: () => ReturnType<typeof defaultRequestVideoStream>
  mediaDevices?: Pick<MediaDevices, 'addEventListener' | 'removeEventListener'>
  onStateChange(state: CameraState, issue: CameraIssue | null): void
}

export interface CameraManager {
  attachVideo(video: HTMLVideoElement | null): void
  start(): Promise<void>
  stop(): void
  release(): void
  getState(): CameraState
  getIssue(): CameraIssue | null
}

interface CameraInternalState {
  cameraState: CameraState
  issue: CameraIssue | null
  stream: MediaStream | null
  video: HTMLVideoElement | null
  seq: number
  stopMonitoring: (() => void) | null
}

function createInternalState(): CameraInternalState {
  return {
    cameraState: 'idle',
    issue: null,
    stream: null,
    video: null,
    seq: 0,
    stopMonitoring: null,
  }
}

function setState(
  internal: CameraInternalState,
  deps: CameraManagerDeps,
  nextState: CameraState,
  nextIssue: CameraIssue | null,
): void {
  internal.cameraState = nextState
  internal.issue = nextIssue
  if (nextState === 'active' && !internal.stopMonitoring) {
    internal.stopMonitoring = monitorActiveStream(internal, deps)
  }
  if (nextState !== 'active' && internal.stopMonitoring) {
    internal.stopMonitoring()
    internal.stopMonitoring = null
  }
  deps.onStateChange(nextState, nextIssue)
}

function releaseStreamResources(internal: CameraInternalState): void {
  clearVideoTrackEndHandlers(internal.stream)
  stopVideoStream(internal.stream ?? undefined)
  internal.stream = null
  if (internal.video) internal.video.srcObject = null
}

function interrupt(
  internal: CameraInternalState,
  deps: CameraManagerDeps,
  interruptedStream: MediaStream,
  kind: 'interrupted' | 'disconnected',
): void {
  if (internal.cameraState !== 'active' || internal.stream !== interruptedStream) return
  releaseStreamResources(internal)
  setState(internal, deps, 'error', { kind })
}

function checkStreamHealth(internal: CameraInternalState, deps: CameraManagerDeps): void {
  if (!internal.stream || hasLiveVideoTrack(internal.stream)) return
  interrupt(internal, deps, internal.stream, 'interrupted')
}

/** Watches the active stream for ended tracks and device removal; returns the unsubscribe. */
function monitorActiveStream(internal: CameraInternalState, deps: CameraManagerDeps): () => void {
  const pollTimer = setInterval(() => checkStreamHealth(internal, deps), HEALTH_POLL_MS)
  const mediaDevices =
    deps.mediaDevices ?? (typeof navigator === 'undefined' ? undefined : navigator.mediaDevices)
  const onDeviceChange = (): void => {
    if (!internal.stream || hasLiveVideoTrack(internal.stream)) return
    interrupt(internal, deps, internal.stream, 'disconnected')
  }
  mediaDevices?.addEventListener?.('devicechange', onDeviceChange)
  return () => {
    clearInterval(pollTimer)
    mediaDevices?.removeEventListener?.('devicechange', onDeviceChange)
  }
}

function handlePlaybackFailure(
  internal: CameraInternalState,
  deps: CameraManagerDeps,
  failedStream: MediaStream,
  requestSeq: number,
  error: unknown,
): void {
  if (requestSeq !== internal.seq) return
  if (import.meta.env?.DEV) logger.warn('video.play failed', error)
  stopVideoStream(failedStream)
  internal.stream = null
  if (internal.video) internal.video.srcObject = null
  setState(internal, deps, 'error', { kind: 'playback-failed' })
}

function attachStream(
  internal: CameraInternalState,
  deps: CameraManagerDeps,
  nextStream: MediaStream,
  requestSeq: number,
): void {
  internal.stream = nextStream
  for (const track of nextStream.getVideoTracks()) {
    track.onended = () => interrupt(internal, deps, nextStream, 'interrupted')
  }
  if (!internal.video) {
    setState(internal, deps, 'active', null)
    return
  }
  internal.video.srcObject = nextStream
  internal.video.play().then(
    () => {
      if (requestSeq === internal.seq) setState(internal, deps, 'active', null)
    },
    (error: unknown) => handlePlaybackFailure(internal, deps, nextStream, requestSeq, error),
  )
}

async function start(
  internal: CameraInternalState,
  deps: CameraManagerDeps,
  requestVideoStream: () => ReturnType<typeof defaultRequestVideoStream>,
): Promise<void> {
  const requestSeq = ++internal.seq
  setState(internal, deps, 'requesting', null)
  const result = await requestVideoStream()

  if (requestSeq !== internal.seq) {
    if (result.ok) stopVideoStream(result.stream)
    return
  }
  if (result.ok) {
    attachStream(internal, deps, result.stream, requestSeq)
    return
  }
  internal.stream = null
  const denied =
    result.error.name === 'NotAllowedError' || result.error.name === 'PermissionDeniedError'
  setState(internal, deps, denied ? 'denied' : 'error', {
    kind: 'request-failed',
    name: result.error.name,
    message: result.error.message,
  })
}

export function createCameraManager(deps: CameraManagerDeps): CameraManager {
  const requestVideoStream = deps.requestVideoStream ?? defaultRequestVideoStream
  const internal = createInternalState()

  return {
    attachVideo(nextVideo) {
      internal.video = nextVideo
    },
    start: () => start(internal, deps, requestVideoStream),
    stop() {
      internal.seq += 1
      releaseStreamResources(internal)
      setState(internal, deps, 'idle', null)
    },
    release() {
      internal.seq += 1
      releaseStreamResources(internal)
      if (internal.cameraState !== 'idle') setState(internal, deps, 'idle', null)
    },
    getState: () => internal.cameraState,
    getIssue: () => internal.issue,
  }
}
