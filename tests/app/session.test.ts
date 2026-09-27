import { describe, expect, it } from 'vitest'

import {
  formatDiagnosticsJson,
  formatDiagnosticsText,
} from '../../src/app/experience/debug/diagnosticsFormatting'

describe('diagnostic formatting', () => {
  it('formats diagnostics with explicit runtime and safety fields', () => {
    const overlay = {
      rendererMode: 'webgl' as const,
      effectsActive: true,
      fps: 59.95,
      frameTimeMs: 16.67,
      renderScale: 0.75,
      resourceCounts: {
        renderTargets: 2,
        temporalPairs: 1,
        estimatedTextures: 4,
        estimatedFramebuffers: 2,
      },
      activeVideoNodes: ['grain'],
    }
    const sources = {
      getOverlayDiagnostics: () => overlay,
      audioStatus: 'on' as const,
      micStatus: 'on' as const,
      couplingStrength: 0.6,
      maxFeedback: 0.25,
      lastError: 'none',
      getAudioMetrics: () => ({ rms: 0.1, centroid: 0.2, flux: 0.3 }),
      getVideoMetrics: () => ({ motion: 0.4, luminance: 0.5, edge: 0.6, instability: 0.7 }),
      getAppliedClamps: () => ({
        intensityInput: 0.9,
        intensityEffective: 0.4,
        safeMode: true,
        reducedMotion: true,
        safeModeClampKeys: ['max_intensity'],
        reducedMotionDisabledNodes: ['temporal_smear'],
      }),
    }

    const text = formatDiagnosticsText(sources, overlay)
    const json = JSON.parse(formatDiagnosticsJson(sources, overlay))

    expect(text).toContain('renderer: webgl')
    expect(text).toContain('clamps.intensity: 0.900 -> 0.400')
    expect(text).toContain('video.activeNodes: grain')
    expect(json).toMatchObject({
      overlay: { rendererMode: 'webgl', effectsActive: true },
      audioStatus: 'on',
      micStatus: 'on',
      appliedClamps: { intensityEffective: 0.4, reducedMotion: true },
    })
  })
})
