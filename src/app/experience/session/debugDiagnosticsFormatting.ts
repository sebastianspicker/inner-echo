import type {
  AudioEngineDebugState,
  AudioMetrics,
  AudioContextStatus,
  MicStatus,
} from '../../../runtime/audio'
import type { OverlayDiagnostics, VideoMetrics } from '../../../runtime/visual/overlay'
import type { AppliedClampSnapshot } from './useOverlayController'

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

function formatOverlayLines(overlay: OverlayDiagnostics | undefined): string[] {
  return [
    `renderer: ${overlay?.rendererMode ?? 'none'}`,
    `fps: ${overlay?.fps != null ? overlay.fps.toFixed(1) : 'n/a'}`,
    `frameTimeMs: ${overlay?.frameTimeMs != null ? overlay.frameTimeMs.toFixed(2) : 'n/a'}`,
    `renderScale: ${overlay?.renderScale ?? 'n/a'}`,
    `resources.renderTargets: ${overlay?.resourceCounts?.renderTargets ?? 'n/a'}`,
    `resources.temporalPairs: ${overlay?.resourceCounts?.temporalPairs ?? 'n/a'}`,
    `resources.estimatedTextures: ${overlay?.resourceCounts?.estimatedTextures ?? 'n/a'}`,
    `resources.estimatedFramebuffers: ${overlay?.resourceCounts?.estimatedFramebuffers ?? 'n/a'}`,
    `video.activeNodes: ${(overlay?.activeVideoNodes ?? []).join(', ') || 'n/a'}`,
  ]
}

function formatMetricLines(sources: DebugDiagnosticsSources): string[] {
  const audio = sources.getAudioMetrics?.()
  const video = sources.getVideoMetrics?.()
  return [
    ...(audio
      ? [
          `audio.rms: ${audio.rms.toFixed(3)}`,
          `audio.centroid: ${audio.centroid.toFixed(3)}`,
          `audio.flux: ${audio.flux.toFixed(3)}`,
          ...(typeof audio.micRms === 'number' ? [`mic.rms: ${audio.micRms.toFixed(3)}`] : []),
          ...(typeof audio.micCentroid === 'number'
            ? [`mic.centroid: ${audio.micCentroid.toFixed(3)}`]
            : []),
          ...(typeof audio.micFlux === 'number' ? [`mic.flux: ${audio.micFlux.toFixed(3)}`] : []),
        ]
      : []),
    ...(video
      ? [
          `video.motion: ${video.motion.toFixed(3)}`,
          `video.luminance: ${video.luminance.toFixed(3)}`,
          `video.edge: ${video.edge.toFixed(3)}`,
          `video.instability: ${video.instability.toFixed(3)}`,
        ]
      : []),
  ]
}

function formatAudioStateLines(sources: DebugDiagnosticsSources): string[] {
  const debug = sources.getAudioDebugState?.()
  if (!debug) return []
  return [
    `audio.activeNodes: ${debug.activeNodes.join(', ') || 'n/a'}`,
    `audio.inputMode: ${debug.inputMode}`,
    `audio.micEnabled: ${debug.micEnabled ? 'yes' : 'no'}`,
    `audio.micGateGain: ${debug.micGateGain != null ? debug.micGateGain.toFixed(3) : 'n/a'}`,
  ]
}

function formatClampStateLines(sources: DebugDiagnosticsSources): string[] {
  const clamps = sources.getAppliedClamps?.()
  if (!clamps) return []
  return [
    `clamps.intensity: ${clamps.intensityInput.toFixed(3)} -> ${clamps.intensityEffective.toFixed(3)}`,
    `clamps.safeMode: ${clamps.safeMode ? 'on' : 'off'}`,
    `clamps.reducedMotion: ${clamps.reducedMotion ? 'on' : 'off'}`,
    `clamps.safeModeKeys: ${clamps.safeModeClampKeys.join(', ') || 'none'}`,
    `clamps.reducedMotionDisabledNodes: ${clamps.reducedMotionDisabledNodes.join(', ') || 'none'}`,
  ]
}

export function formatDiagnosticsText(
  sources: DebugDiagnosticsSources,
  overlay: OverlayDiagnostics | undefined,
): string {
  const lines: string[] = [
    `Inner Echo diagnostics: ${new Date().toISOString()}`,
    '---',
    ...formatOverlayLines(overlay),
    `audio: ${sources.audioStatus}`,
    `mic: ${sources.micStatus}`,
    `couplingStrength: ${sources.couplingStrength ?? 'n/a'}`,
    `maxFeedback: ${sources.maxFeedback ?? 'n/a'}`,
  ]
  lines.push(
    ...formatMetricLines(sources),
    ...formatAudioStateLines(sources),
    ...formatClampStateLines(sources),
  )
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
