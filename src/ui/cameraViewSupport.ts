import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { OverlayControl } from '../engine/canvas'
import { stopVideoStream, type CameraState } from '../engine/video'
import { clearVideoTrackEndHandlers, hasLiveVideoTrack } from './cameraRuntime'

export const CAMERA_STREAM_INTERRUPTED_MESSAGE =
  'The camera connection was briefly interrupted. You can restart it whenever you are ready.'
export const CAMERA_DEVICE_DISCONNECTED_MESSAGE =
  'It seems your camera was disconnected. Please reconnect it and start again when you are ready.'

export interface CameraInterruptionContext {
  streamRef: MutableRefObject<MediaStream | null>
  videoRef: MutableRefObject<HTMLVideoElement | null>
  overlayControlRef: MutableRefObject<OverlayControl | null>
  cameraStateRef: MutableRefObject<CameraState>
  setCameraState: Dispatch<SetStateAction<CameraState>>
  setErrorMessage: Dispatch<SetStateAction<string | null>>
}

export function handleCameraStreamInterruption(
  context: CameraInterruptionContext,
  stream: MediaStream | null | undefined,
  message: string,
): void {
  if (!stream || context.streamRef.current === null) return
  if (context.cameraStateRef.current !== 'active' || context.streamRef.current !== stream) return
  context.overlayControlRef.current?.stop()
  context.overlayControlRef.current = null
  clearVideoTrackEndHandlers(stream)
  stopVideoStream(stream)
  context.streamRef.current = null
  const video = context.videoRef.current
  if (video) video.srcObject = null
  context.setCameraState('error')
  context.setErrorMessage(message)
}

export function subscribeToCameraDeviceChanges(
  cameraStateRef: MutableRefObject<CameraState>,
  streamRef: MutableRefObject<MediaStream | null>,
  onInterrupted: (stream: MediaStream, message: string) => void,
): (() => void) | undefined {
  const mediaDevices = navigator.mediaDevices
  if (!mediaDevices?.addEventListener) return
  const onDeviceChange = (): void => {
    const stream = streamRef.current
    if (cameraStateRef.current !== 'active' || !stream || hasLiveVideoTrack(stream)) return
    onInterrupted(stream, CAMERA_DEVICE_DISCONNECTED_MESSAGE)
  }
  mediaDevices.addEventListener('devicechange', onDeviceChange)
  return () => mediaDevices.removeEventListener('devicechange', onDeviceChange)
}

export function monitorCameraStream(
  cameraState: CameraState,
  streamRef: MutableRefObject<MediaStream | null>,
  onInterrupted: (stream: MediaStream, message: string) => void,
): (() => void) | undefined {
  if (cameraState !== 'active') return
  const timer = window.setInterval(() => {
    const stream = streamRef.current
    if (!stream || hasLiveVideoTrack(stream)) return
    onInterrupted(stream, CAMERA_STREAM_INTERRUPTED_MESSAGE)
  }, 250)
  return () => window.clearInterval(timer)
}
