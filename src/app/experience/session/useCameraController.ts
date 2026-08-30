import { useMemo } from 'react'
import type { CameraState } from '../../../runtime/camera'
import type { AudioContextStatus, MicStatus } from '../../../runtime/audio'

export interface UseCameraControllerParams {
  cameraState: CameraState
  audioStatus: AudioContextStatus
  micStatus: MicStatus
  onStart: () => void
  onStop: () => void
}

export function useCameraController(params: UseCameraControllerParams): {
  isRequesting: boolean
  isActive: boolean
  canStop: boolean
  start: () => void
  stop: () => void
} {
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
