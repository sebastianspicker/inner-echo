import { useMemo } from 'react'
import type { CameraState } from '../../engine/video'
import type { AudioContextStatus, MicStatus } from '../../engine/audio'

export interface UseCameraControllerParams {
  cameraState: CameraState
  audioStatus: AudioContextStatus
  micStatus: MicStatus
  onStart: () => void
  onStop: () => void
}

export function useCameraController(params: UseCameraControllerParams) {
  const { cameraState, audioStatus, micStatus, onStart, onStop } = params
  return useMemo(() => {
    const isRequesting = cameraState === 'requesting'
    const isActive = cameraState === 'active'
    const canStop = isRequesting || isActive || audioStatus !== 'off' || micStatus !== 'off'
    return {
      isRequesting,
      isActive,
      canStop,
      start: onStart,
      stop: onStop,
    }
  }, [cameraState, audioStatus, micStatus, onStart, onStop])
}
