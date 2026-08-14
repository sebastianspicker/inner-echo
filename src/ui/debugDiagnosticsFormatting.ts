import type {
  AudioEngineDebugState,
  AudioMetrics,
  AudioContextStatus,
  MicStatus,
} from '../engine/audio'
import type { OverlayDiagnostics, VideoMetrics } from '../engine/canvas'
import type { AppliedClampSnapshot } from './hooks/useOverlayController'

export interface DebugDiagnosticsSources {
  getOverlayDiagnostics: () => OverlayDiagnostics | undefined
  audioStatus: AudioContextStatus
  micStatus: MicStatus
  lastError?: string | null
  getAudioMetrics?: () => AudioMetrics | undefined
  getVideoMetrics?: () => VideoMetrics | undefined
  getAudioDebugState?: () => AudioEngineDebugState | undefined
  getAppliedClamps?: () => AppliedClampSnapshot | undefined
  couplingStrength?: number
  maxFeedback?: number
  micSensitivity?: number
  micGate?: number
}

export function formatDiagnosticsText(
  sources: DebugDiagnosticsSources,
  overlay: OverlayDiagnostics | undefined,
): string {
  const audioMetrics = sources.getAudioMetrics?.()
  const videoMetrics = sources.getVideoMetrics?.()
  const audioDebug = sources.getAudioDebugState?.()
  const appliedClamps = sources.getAppliedClamps?.()
  const lines: string[] = [
    `Inner Echo diagnostics: ${new Date().toISOString()}`,
    '---',
    `renderer: ${overlay?.rendererMode ?? 'none'}`,
    `fps: ${overlay?.fps != null ? overlay.fps.toFixed(1) : 'n/a'}`,
    `frameTimeMs: ${overlay?.frameTimeMs != null ? overlay.frameTimeMs.toFixed(2) : 'n/a'}`,
    `renderScale: ${overlay?.renderScale ?? 'n/a'}`,
    `resources.renderTargets: ${overlay?.resourceCounts?.renderTargets ?? 'n/a'}`,
    `resources.temporalPairs: ${overlay?.resourceCounts?.temporalPairs ?? 'n/a'}`,
    `resources.estimatedTextures: ${overlay?.resourceCounts?.estimatedTextures ?? 'n/a'}`,
    `resources.estimatedFramebuffers: ${overlay?.resourceCounts?.estimatedFramebuffers ?? 'n/a'}`,
    `video.activeNodes: ${(overlay?.activeVideoNodes ?? []).join(', ') || 'n/a'}`,
    `audio: ${sources.audioStatus}`,
    `mic: ${sources.micStatus}`,
    `couplingStrength: ${sources.couplingStrength ?? 'n/a'}`,
    `maxFeedback: ${sources.maxFeedback ?? 'n/a'}`,
  ]
  if (audioMetrics) {
    lines.push(`audio.rms: ${audioMetrics.rms.toFixed(3)}`)
    lines.push(`audio.centroid: ${audioMetrics.centroid.toFixed(3)}`)
    lines.push(`audio.flux: ${audioMetrics.flux.toFixed(3)}`)
    if (typeof audioMetrics.micRms === 'number')
      lines.push(`mic.rms: ${audioMetrics.micRms.toFixed(3)}`)
    if (typeof audioMetrics.micCentroid === 'number')
      lines.push(`mic.centroid: ${audioMetrics.micCentroid.toFixed(3)}`)
    if (typeof audioMetrics.micFlux === 'number')
      lines.push(`mic.flux: ${audioMetrics.micFlux.toFixed(3)}`)
  }
  if (videoMetrics) {
    lines.push(`video.motion: ${videoMetrics.motion.toFixed(3)}`)
    lines.push(`video.luminance: ${videoMetrics.luminance.toFixed(3)}`)
    lines.push(`video.edge: ${videoMetrics.edge.toFixed(3)}`)
    lines.push(`video.instability: ${videoMetrics.instability.toFixed(3)}`)
  }
  if (audioDebug) {
    lines.push(`audio.activeNodes: ${audioDebug.activeNodes.join(', ') || 'n/a'}`)
    lines.push(`audio.inputMode: ${audioDebug.inputMode}`)
    lines.push(`audio.micEnabled: ${audioDebug.micEnabled ? 'yes' : 'no'}`)
    lines.push(
      `audio.micGateGain: ${audioDebug.micGateGain != null ? audioDebug.micGateGain.toFixed(3) : 'n/a'}`,
    )
  }
  if (appliedClamps) {
    lines.push(
      `clamps.intensity: ${appliedClamps.intensityInput.toFixed(3)} -> ${appliedClamps.intensityEffective.toFixed(3)}`,
    )
    lines.push(`clamps.safeMode: ${appliedClamps.safeMode ? 'on' : 'off'}`)
    lines.push(`clamps.reducedMotion: ${appliedClamps.reducedMotion ? 'on' : 'off'}`)
    lines.push(`clamps.safeModeKeys: ${appliedClamps.safeModeClampKeys.join(', ') || 'none'}`)
    lines.push(
      `clamps.reducedMotionDisabledNodes: ${appliedClamps.reducedMotionDisabledNodes.join(', ') || 'none'}`,
    )
  }
  if (sources.lastError) lines.push(`lastError: ${sources.lastError}`)
  return lines.join('\n')
}

export function formatDiagnosticsJson(
  sources: DebugDiagnosticsSources,
  overlay: OverlayDiagnostics | undefined,
): string {
  return JSON.stringify(
    {
      ts: new Date().toISOString(),
      overlay,
      audioStatus: sources.audioStatus,
      micStatus: sources.micStatus,
      couplingStrength: sources.couplingStrength,
      maxFeedback: sources.maxFeedback,
      lastError: sources.lastError ?? null,
      audioMetrics: sources.getAudioMetrics?.() ?? null,
      videoMetrics: sources.getVideoMetrics?.() ?? null,
      audioDebug: sources.getAudioDebugState?.() ?? null,
      appliedClamps: sources.getAppliedClamps?.() ?? null,
    },
    null,
    2,
  )
}
