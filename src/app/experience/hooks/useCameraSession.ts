import { useCallback, useEffect, useMemo } from 'react'

import {
  releaseCameraRuntime,
  startCameraRuntime,
  stopCameraRuntime,
  type CameraRuntimeContext,
} from '../session/cameraRuntime'
import {
  CAMERA_STREAM_INTERRUPTED_MESSAGE,
  handleCameraStreamInterruption,
  monitorCameraStream,
  subscribeToCameraDeviceChanges,
  type CameraInterruptionContext,
} from '../session/cameraSessionSupport'
import type { useAudioRuntime } from '../session/useAudioRuntime'
import { useCameraController } from '../session/useCameraController'
import type { WorkspaceRefs } from './workspaceRefs'
import type { WorkspaceState } from './workspaceState'

function useCameraRuntimeContext(
  state: WorkspaceState,
  refs: WorkspaceRefs,
  audio: ReturnType<typeof useAudioRuntime>,
) {
  return useMemo<CameraRuntimeContext>(
    () => ({
      streamRef: refs.streamRef,
      videoRef: refs.videoRef,
      canvasRef: refs.canvasRef,
      fallbackCanvasRef: refs.fallbackCanvasRef,
      overlayControlRef: refs.overlayControlRef,
      audioEngineControlRef: audio.audioEngineControlRef,
      cameraRequestSeqRef: refs.cameraRequestSeqRef,
      audioRequestSeqRef: audio.audioRequestSeqRef,
      setCameraState: state.camera.setCameraState,
      setErrorMessage: state.camera.setErrorMessage,
      setAudioStatus: audio.setAudioStatus,
      setAudioError: audio.setAudioError,
      setMicStatus: audio.setMicStatus,
      setMicError: audio.setMicError,
    }),
    [
      refs.streamRef,
      refs.videoRef,
      refs.canvasRef,
      refs.fallbackCanvasRef,
      refs.overlayControlRef,
      audio.audioEngineControlRef,
      refs.cameraRequestSeqRef,
      audio.audioRequestSeqRef,
      state.camera.setCameraState,
      state.camera.setErrorMessage,
      audio.setAudioStatus,
      audio.setAudioError,
      audio.setMicStatus,
      audio.setMicError,
    ],
  )
}

function useCameraInterruptionContext(state: WorkspaceState, refs: WorkspaceRefs) {
  return useMemo<CameraInterruptionContext>(
    () => ({
      streamRef: refs.streamRef,
      videoRef: refs.videoRef,
      overlayControlRef: refs.overlayControlRef,
      cameraStateRef: refs.cameraStateRef,
      setCameraState: state.camera.setCameraState,
      setErrorMessage: state.camera.setErrorMessage,
    }),
    [
      refs.streamRef,
      refs.videoRef,
      refs.overlayControlRef,
      refs.cameraStateRef,
      state.camera.setCameraState,
      state.camera.setErrorMessage,
    ],
  )
}

export function useCameraSession(
  state: WorkspaceState,
  refs: WorkspaceRefs,
  audio: ReturnType<typeof useAudioRuntime>,
) {
  const runtimeContext = useCameraRuntimeContext(state, refs, audio)
  const interruptionContext = useCameraInterruptionContext(state, refs)
  const interrupt = useCallback(
    (stream: MediaStream | null | undefined, message: string) =>
      handleCameraStreamInterruption(interruptionContext, stream, message),
    [interruptionContext],
  )
  const start = useCallback(
    () =>
      startCameraRuntime(runtimeContext, (stream) =>
        interrupt(stream, CAMERA_STREAM_INTERRUPTED_MESSAGE),
      ),
    [interrupt, runtimeContext],
  )
  const stop = useCallback(() => stopCameraRuntime(runtimeContext), [runtimeContext])
  useEffect(
    () => subscribeToCameraDeviceChanges(refs.cameraStateRef, refs.streamRef, interrupt),
    [interrupt, refs.cameraStateRef, refs.streamRef],
  )
  useEffect(
    () => monitorCameraStream(state.camera.cameraState, refs.streamRef, interrupt),
    [interrupt, refs.streamRef, state.camera.cameraState],
  )
  useEffect(() => () => releaseCameraRuntime(runtimeContext), [runtimeContext])
  return useCameraController({
    cameraState: state.camera.cameraState,
    audioStatus: audio.audioStatus,
    micStatus: audio.micStatus,
    onStart: start,
    onStop: stop,
  })
}
