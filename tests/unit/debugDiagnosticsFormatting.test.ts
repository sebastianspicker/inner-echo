import { describe, expect, it } from 'vitest'
import {
  formatDiagnosticsJson,
  formatDiagnosticsText,
  type DebugDiagnosticsSources,
} from '../../src/ui/debugDiagnosticsFormatting'

const sources: DebugDiagnosticsSources = {
  getOverlayDiagnostics: () => undefined,
  audioStatus: 'on',
  micStatus: 'on',
  lastError: 'camera unavailable',
  couplingStrength: 0.4,
  maxFeedback: 0.2,
  getAudioMetrics: () => ({
    rms: 0.25,
    centroid: 0.5,
    flux: 0.75,
    micRms: 0.125,
  }),
  getVideoMetrics: () => ({
    motion: 0.1,
    luminance: 0.2,
    edge: 0.3,
    instability: 0.4,
  }),
  getAudioDebugState: () => ({
    activeNodes: ['noise_bed'],
    inputMode: 'mix',
    micEnabled: true,
    micSensitivity: 0.6,
    micGate: 0.1,
    micGateGain: 0.8,
  }),
  getAppliedClamps: () => ({
    intensityInput: 0.8,
    intensityEffective: 0.6,
    safeMode: true,
    reducedMotion: false,
    safeModeClampKeys: ['video.0.amount'],
    reducedMotionDisabledNodes: ['temporal_smear'],
  }),
}

const overlay = {
  rendererMode: 'webgl' as const,
  effectsActive: true,
  fps: 59.94,
  frameTimeMs: 16.68,
  renderScale: 0.75,
  resourceCounts: {
    renderTargets: 2,
    temporalPairs: 1,
    estimatedTextures: 4,
    estimatedFramebuffers: 2,
  },
  activeVideoNodes: ['grain'],
}

describe('debug diagnostics formatting', () => {
  it('retains the human-readable diagnostics contract', () => {
    const text = formatDiagnosticsText(sources, overlay)

    expect(text).toContain('renderer: webgl')
    expect(text).toContain('fps: 59.9')
    expect(text).toContain('audio.rms: 0.250')
    expect(text).toContain('video.instability: 0.400')
    expect(text).toContain('audio.micGateGain: 0.800')
    expect(text).toContain('clamps.intensity: 0.800 -> 0.600')
    expect(text).toContain('lastError: camera unavailable')
  })

  it('retains the structured diagnostics payload', () => {
    const payload = JSON.parse(formatDiagnosticsJson(sources, overlay)) as Record<string, unknown>

    expect(payload.overlay).toEqual(overlay)
    expect(payload.audioStatus).toBe('on')
    expect(payload.micStatus).toBe('on')
    expect(payload.audioMetrics).toEqual(sources.getAudioMetrics?.())
    expect(payload.videoMetrics).toEqual(sources.getVideoMetrics?.())
    expect(payload.audioDebug).toEqual(sources.getAudioDebugState?.())
    expect(payload.appliedClamps).toEqual(sources.getAppliedClamps?.())
    expect(payload.ts).toEqual(expect.any(String))
  })
})
