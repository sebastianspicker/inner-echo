import { useRef } from 'react'
import type { MutableRefObject } from 'react'

import type { Profile } from '../../../domain/experience/schema'
import type { CameraState } from '../../../runtime/camera'
import type { OverlayControl, VideoMetrics } from '../../../runtime/visual/overlay'
import type { WorkspaceState } from './workspaceState'

export function useWorkspaceRefs(
  state: WorkspaceState,
  profileRef: MutableRefObject<Profile | null>,
  profile: Profile | null,
  controlValues: Record<string, number | boolean>,
) {
  const couplingStrengthRef = useRef(state.coupling.couplingStrength)
  const maxFeedbackRef = useRef(state.coupling.maxFeedback)
  const safeModeRef = useRef(state.safety.safeMode)
  const intensityRef = useRef(state.safety.intensity)
  const controlValuesRef = useRef(controlValues)
  const stressModeRef = useRef(state.safety.stressMode)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayControlRef = useRef<OverlayControl | null>(null)
  const rmsDebugRef = useRef<HTMLSpanElement | null>(null)
  const videoMetricsRef = useRef<VideoMetrics | null>(null)
  const cameraRequestSeqRef = useRef(0)
  const cameraStateRef = useRef<CameraState>(state.camera.cameraState)
  couplingStrengthRef.current = state.coupling.couplingStrength
  maxFeedbackRef.current = state.coupling.maxFeedback
  safeModeRef.current = state.safety.safeMode
  intensityRef.current = state.safety.intensity
  controlValuesRef.current = controlValues
  stressModeRef.current = state.safety.stressMode
  profileRef.current = profile
  cameraStateRef.current = state.camera.cameraState
  return {
    profileRef,
    couplingStrengthRef,
    maxFeedbackRef,
    safeModeRef,
    intensityRef,
    controlValuesRef,
    stressModeRef,
    streamRef,
    videoRef,
    containerRef,
    canvasRef,
    fallbackCanvasRef,
    overlayControlRef,
    rmsDebugRef,
    videoMetricsRef,
    cameraRequestSeqRef,
    cameraStateRef,
  }
}

export type WorkspaceRefs = ReturnType<typeof useWorkspaceRefs>
