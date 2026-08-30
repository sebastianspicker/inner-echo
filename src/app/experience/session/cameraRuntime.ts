import type { Profile } from '../../../domain/experience/schema'
import {
  closeAudioContext,
  type AudioContextStatus,
  type AudioEngineControl,
  type MicStatus,
} from '../../../runtime/audio'
import type { OverlayControl } from '../../../runtime/visual/overlay'
import {
  requestVideoStream,
  stopVideoStream,
  type CameraState,
  type RequestVideoResult,
} from '../../../runtime/camera'
import { logger } from '../../../platform/logger'
import { getCameraErrorMessage } from './cameraMessages'

interface MutableRef<T> {
  current: T
}

export interface CameraRuntimeRefs {
  streamRef: MutableRef<MediaStream | null>
  videoRef: MutableRef<HTMLVideoElement | null>
  canvasRef: MutableRef<HTMLCanvasElement | null>
  fallbackCanvasRef: MutableRef<HTMLCanvasElement | null>
  overlayControlRef: MutableRef<OverlayControl | null>
  audioEngineControlRef: MutableRef<AudioEngineControl | null>
  cameraRequestSeqRef: MutableRef<number>
  audioRequestSeqRef: MutableRef<number>
}

export interface CameraRuntimeSetters {
  setCameraState: (state: CameraState) => void
  setErrorMessage: (message: string | null) => void
  setAudioStatus: (status: AudioContextStatus) => void
  setAudioError: (message: string | null) => void
  setMicStatus: (status: MicStatus) => void
  setMicError: (message: string | null) => void
}

export interface CameraRuntimeContext extends CameraRuntimeRefs, CameraRuntimeSetters {}

export interface CameraRuntimeDependencies {
  requestVideoStream?: () => Promise<RequestVideoResult>
}

export function hasLiveVideoTrack(stream: MediaStream): boolean {
  return stream.getVideoTracks().some((track) => track.readyState === 'live')
}

export function clearVideoTrackEndHandlers(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getVideoTracks()) track.onended = null
}

function clearPrimaryCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) return
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  if (gl) {
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return
  }
  canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
}

function clearFallbackCanvas(canvas: HTMLCanvasElement | null): void {
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  canvas.hidden = true
}

function releaseCameraResources(context: CameraRuntimeRefs): void {
  context.overlayControlRef.current?.stop()
  context.overlayControlRef.current = null
  const audioControl = context.audioEngineControlRef.current
  if (audioControl) audioControl.stop()
  else void closeAudioContext()
  context.audioEngineControlRef.current = null
  clearVideoTrackEndHandlers(context.streamRef.current)
  stopVideoStream(context.streamRef.current ?? undefined)
  context.streamRef.current = null
  if (context.videoRef.current) context.videoRef.current.srcObject = null
}

function handlePlaybackFailure(
  context: CameraRuntimeContext,
  stream: MediaStream,
  requestSeq: number,
  error: unknown,
): void {
  if (requestSeq !== context.cameraRequestSeqRef.current) return
  if (import.meta.env?.DEV) logger.warn('video.play failed', error)
  stopVideoStream(stream)
  context.streamRef.current = null
  if (context.videoRef.current) context.videoRef.current.srcObject = null
  context.setCameraState('error')
  context.setErrorMessage(
    'The camera could not start playback. Please try clicking anywhere on the page and then restarting the camera.',
  )
}

function attachCameraStream(
  context: CameraRuntimeContext,
  stream: MediaStream,
  requestSeq: number,
  onInterrupted: (stream: MediaStream) => void,
): void {
  context.streamRef.current = stream
  for (const track of stream.getVideoTracks()) track.onended = () => onInterrupted(stream)
  const video = context.videoRef.current
  if (!video) {
    context.setCameraState('active')
    return
  }
  video.srcObject = stream
  video.play().then(
    () => {
      if (requestSeq === context.cameraRequestSeqRef.current) context.setCameraState('active')
    },
    (error) => handlePlaybackFailure(context, stream, requestSeq, error),
  )
}

export async function startCameraRuntime(
  context: CameraRuntimeContext,
  onInterrupted: (stream: MediaStream) => void,
  dependencies: CameraRuntimeDependencies = {},
): Promise<void> {
  const requestSeq = ++context.cameraRequestSeqRef.current
  context.setErrorMessage(null)
  context.setCameraState('requesting')
  const result = await (dependencies.requestVideoStream ?? requestVideoStream)()

  if (requestSeq !== context.cameraRequestSeqRef.current) {
    if (result.ok) stopVideoStream(result.stream)
    return
  }
  if (result.ok) {
    attachCameraStream(context, result.stream, requestSeq, onInterrupted)
    return
  }

  context.streamRef.current = null
  const denied =
    result.error.name === 'NotAllowedError' || result.error.name === 'PermissionDeniedError'
  context.setCameraState(denied ? 'denied' : 'error')
  context.setErrorMessage(getCameraErrorMessage(result.error))
}

export function stopCameraRuntime(context: CameraRuntimeContext): void {
  context.cameraRequestSeqRef.current += 1
  context.audioRequestSeqRef.current += 1
  releaseCameraResources(context)
  context.setAudioStatus('off')
  context.setAudioError(null)
  context.setMicStatus('off')
  context.setMicError(null)
  clearPrimaryCanvas(context.canvasRef.current)
  clearFallbackCanvas(context.fallbackCanvasRef.current)
  context.setCameraState('idle')
  context.setErrorMessage(null)
}

export function releaseCameraRuntime(context: CameraRuntimeRefs): void {
  context.cameraRequestSeqRef.current += 1
  context.audioRequestSeqRef.current += 1
  releaseCameraResources(context)
}

export function syncConditionAudio(
  control: AudioEngineControl | null,
  audioStatus: AudioContextStatus,
  audioEnabled: boolean,
  profile: Profile | null,
  setMasterVolume: (volume: number) => void,
): void {
  if (audioStatus !== 'on' || !control) return
  const configuredStack = profile?.audio_stack
  const audioStack = audioEnabled
    ? configuredStack
      ? { ...configuredStack, enabled: true }
      : { enabled: true }
    : { enabled: false }
  control.setConditionAudio(audioStack)
  const volume = audioEnabled ? (profile?.audio_stack?.master?.volume ?? 0.22) : 0
  setMasterVolume(volume)
  control.setMasterVolume(volume)
}

export function startRmsMeter(
  enabled: boolean,
  audioControlRef: MutableRef<AudioEngineControl | null>,
  outputRef: MutableRef<HTMLSpanElement | null>,
): (() => void) | undefined {
  if (!enabled) return
  let rafId: number | null = null
  function tick(): void {
    const rms = audioControlRef.current?.getRms?.() ?? 0
    if (outputRef.current) outputRef.current.textContent = `RMS ${rms.toFixed(3)}`
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
  return () => {
    if (rafId != null) cancelAnimationFrame(rafId)
  }
}
