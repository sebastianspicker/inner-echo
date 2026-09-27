import { describe, expect, it, vi } from 'vitest'
import { profileSchema } from '../../src/domain/experience/schema'
import * as reactiveRuntime from '../../src/runtime/coupling'
import { createReactiveOptions } from '../../src/app/experience/session/reactivePipelineRuntime'

function profileWithReactiveTarget(target?: string) {
  return profileSchema.parse({
    id: 'reactive-demand-fixture',
    label: 'Reactive demand fixture',
    summary: 'A pure application composition fixture.',
    framing: { type: 'metaphor' },
    experience_dimensions: [],
    video_stack: [{ node: 'grain', params: { amount: 0.2 } }],
    audio_stack: { chain: [{ node: 'tremolo', params: { depth: 0.05 } }] },
    reactive: {
      analyser_to_params: target ? [{ source: 'rms', target, scale: 0.1 }] : [],
    },
    safety: {
      intensity_default: 0.3,
      intensity_max: 0.8,
      warnings: [],
      safe_mode_clamps: {},
    },
  })
}

function createRefs() {
  return {
    audioEngineControlRef: { current: null },
    videoMetricsRef: { current: null },
    couplingStrengthRef: { current: 0 },
    maxFeedbackRef: { current: 0.35 },
    safeModeRef: { current: false },
    diagnosticsActiveRef: { current: false },
  }
}

describe('reactive pipeline demand', () => {
  it('tracks coupling and diagnostics refs live without rebuilding options', () => {
    const refs = createRefs()
    const options = createReactiveOptions(reactiveRuntime, profileWithReactiveTarget(), false, refs)

    expect(options.needsVideoMetrics?.()).toBe(false)
    expect(options.needsAudioMetrics?.()).toBe(false)
    expect(options.needsOverrides?.()).toBe(false)

    refs.couplingStrengthRef.current = 0.8
    expect(options.needsVideoMetrics?.()).toBe(true)
    expect(options.needsAudioMetrics?.()).toBe(true)
    expect(options.needsOverrides?.()).toBe(true)

    refs.couplingStrengthRef.current = 0
    refs.diagnosticsActiveRef.current = true
    expect(options.needsVideoMetrics?.()).toBe(import.meta.env.DEV)
    expect(options.needsAudioMetrics?.()).toBe(false)
    expect(options.needsOverrides?.()).toBe(false)
  })

  it('keeps audio sampling and overrides active for an applicable legacy RMS mapping', () => {
    const refs = createRefs()
    const getMetrics = vi.fn(() => ({ rms: 0.5, centroid: 0.2, flux: 0.1 }))
    refs.audioEngineControlRef.current = { getMetrics } as never
    const options = createReactiveOptions(
      reactiveRuntime,
      profileWithReactiveTarget('video.grain.amount'),
      false,
      refs,
    )

    expect(options.needsVideoMetrics?.()).toBe(false)
    expect(options.needsAudioMetrics?.()).toBe(true)
    expect(options.needsOverrides?.()).toBe(true)
    expect(options.getAudioMetrics?.()).toEqual({ rms: 0.5, centroid: 0.2, flux: 0.1 })
    expect(getMetrics).toHaveBeenCalledOnce()
  })

  it('ignores a reactive target that cannot resolve in the active graph', () => {
    const options = createReactiveOptions(
      reactiveRuntime,
      profileWithReactiveTarget('video.missing.amount'),
      false,
      createRefs(),
    )

    expect(options.needsAudioMetrics?.()).toBe(false)
    expect(options.needsOverrides?.()).toBe(false)
  })
})

describe('coupling inactivity state', () => {
  it('resets smoothing to the latest base before coupling resumes', () => {
    const refs = createRefs()
    const resetMetricHistory = vi.fn()
    refs.audioEngineControlRef.current = { resetMetricHistory } as never
    refs.couplingStrengthRef.current = 1
    refs.maxFeedbackRef.current = 1
    const options = createReactiveOptions(reactiveRuntime, profileWithReactiveTarget(), false, refs)
    const audio = { rms: 1, centroid: 1, flux: 1 }
    const video = { motion: 1, luminance: 1, edge: 1, instability: 1 }
    const active = options.getOverrides(10, audio, video, { '0.amount': 0.2 })
    const activeAmount = active.video['0.amount']
    expect(activeAmount).toBeGreaterThan(0.2)

    refs.couplingStrengthRef.current = 0
    options.onInactive?.({ '0.amount': 0.31 })
    expect(resetMetricHistory).toHaveBeenCalledOnce()

    refs.couplingStrengthRef.current = 1
    const resumed = options.getOverrides(0.01, audio, video, { '0.amount': 0.31 })
    expect(resumed.video['0.amount']).toBeGreaterThan(0.31)
    expect(resumed.video['0.amount']).toBeLessThan(activeAmount)
  })
})
