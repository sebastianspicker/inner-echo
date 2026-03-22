import { useCallback, type MutableRefObject } from 'react'
import type { OverlayControl } from '../../engine/canvas'
import type { AudioEngineControl } from '../../engine/audio'
import type { Profile } from '../../conditions/schema'
import { clampIntensity, getReducedMotionDisableNodes } from '../../conditions/normalize'

export interface AppliedClampSnapshot {
  intensityInput: number
  intensityEffective: number
  safeMode: boolean
  reducedMotion: boolean
  safeModeClampKeys: string[]
  reducedMotionDisabledNodes: string[]
}

export interface UseOverlayControllerParams {
  overlayControlRef: MutableRefObject<OverlayControl | null>
  audioControlRef: MutableRefObject<AudioEngineControl | null>
  profile: Profile | null
  reducedMotion: boolean
  safeMode: boolean
  intensity: number
}

export function useOverlayController(params: UseOverlayControllerParams): {
  getOverlayDiagnostics: () => ReturnType<NonNullable<OverlayControl['getDiagnostics']>> | undefined
  getAudioDebugState: () => ReturnType<NonNullable<AudioEngineControl['getDebugState']>> | undefined
  getAppliedClamps: () => AppliedClampSnapshot | undefined
} {
  const {
    overlayControlRef,
    audioControlRef,
    profile,
    reducedMotion,
    safeMode,
    intensity,
  } = params

  const getOverlayDiagnostics = useCallback(
    () => overlayControlRef.current?.getDiagnostics?.(),
    [overlayControlRef]
  )

  const getAudioDebugState = useCallback(
    () => audioControlRef.current?.getDebugState?.(),
    [audioControlRef]
  )

  const getAppliedClamps = useCallback((): AppliedClampSnapshot | undefined => {
    if (!profile) return undefined
    const effectiveIntensity = clampIntensity(profile, intensity, safeMode)
    const safeModeClampKeys = Object.keys(profile.safety.safe_mode_clamps ?? {}).sort((a, b) =>
      a.localeCompare(b)
    )
    const reducedMotionDisabledNodes = Array.from(getReducedMotionDisableNodes(profile)).sort((a, b) =>
      a.localeCompare(b)
    )
    return {
      intensityInput: intensity,
      intensityEffective: effectiveIntensity,
      safeMode,
      reducedMotion,
      safeModeClampKeys,
      reducedMotionDisabledNodes,
    }
  }, [profile, intensity, safeMode, reducedMotion])

  return {
    getOverlayDiagnostics,
    getAudioDebugState,
    getAppliedClamps,
  }
}
