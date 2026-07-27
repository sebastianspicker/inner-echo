import { useEffect, useState } from 'react'
import type { AudioEngineDebugState, AudioMetrics } from '../../engine/audio'
import type { OverlayDiagnostics, VideoMetrics } from '../../engine/canvas'
import type { AppliedClampSnapshot } from './useOverlayController'

export interface DebugDiagnosticsSources {
  getOverlayDiagnostics: () => OverlayDiagnostics | undefined
  getAudioMetrics?: () => AudioMetrics | undefined
  getVideoMetrics?: () => VideoMetrics | undefined
  getAudioDebugState?: () => AudioEngineDebugState | undefined
  getAppliedClamps?: () => AppliedClampSnapshot | undefined
}

export interface DebugDiagnosticsSnapshot {
  overlay: OverlayDiagnostics | undefined
  audioMetrics: AudioMetrics | undefined
  videoMetrics: VideoMetrics | undefined
  audioDebug: AudioEngineDebugState | undefined
  appliedClamps: AppliedClampSnapshot | undefined
}

export function useDebugDiagnostics(sources: DebugDiagnosticsSources): DebugDiagnosticsSnapshot {
  const [overlay, setOverlay] = useState<OverlayDiagnostics | undefined>(() =>
    sources.getOverlayDiagnostics(),
  )
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics | undefined>(() =>
    sources.getAudioMetrics?.(),
  )
  const [videoMetrics, setVideoMetrics] = useState<VideoMetrics | undefined>(() =>
    sources.getVideoMetrics?.(),
  )
  const [audioDebug, setAudioDebug] = useState<AudioEngineDebugState | undefined>(() =>
    sources.getAudioDebugState?.(),
  )
  const [appliedClamps, setAppliedClamps] = useState<AppliedClampSnapshot | undefined>(() =>
    sources.getAppliedClamps?.(),
  )

  // Poll in dev so runtime refs do not need to be lifted into application state.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    let rafId: number | null = null
    function tick(): void {
      setOverlay(sources.getOverlayDiagnostics())
      setAudioMetrics(sources.getAudioMetrics?.())
      setVideoMetrics(sources.getVideoMetrics?.())
      setAudioDebug(sources.getAudioDebugState?.())
      setAppliedClamps(sources.getAppliedClamps?.())
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [
    sources.getOverlayDiagnostics,
    sources.getAudioMetrics,
    sources.getVideoMetrics,
    sources.getAudioDebugState,
    sources.getAppliedClamps,
  ])

  return { overlay, audioMetrics, videoMetrics, audioDebug, appliedClamps }
}
