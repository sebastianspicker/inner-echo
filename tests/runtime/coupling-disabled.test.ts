import { describe, expect, it } from 'vitest'
import { profileSchema } from '../../src/domain/experience/schema'
import {
  createCouplingEngine,
  type CouplingSettings,
} from '../../src/runtime/coupling/couplingEngine'

const profile = profileSchema.parse({
  id: 'coupling-disabled-fixture',
  label: 'Coupling disabled fixture',
  summary: 'A pure runtime fixture.',
  framing: { type: 'metaphor' },
  experience_dimensions: [],
  video_stack: [{ node: 'grain', params: { amount: 0.2 } }],
  audio_stack: { chain: [{ node: 'tremolo', params: { depth: 0.05, rate: 2 } }] },
  safety: {
    intensity_default: 0.3,
    intensity_max: 0.8,
    warnings: [],
    safe_mode_clamps: {},
  },
})

const audioMetrics = { rms: 1, centroid: 1, flux: 1 }
const videoMetrics = { motion: 1, luminance: 1, edge: 1, instability: 1 }

function settings(overrides: Partial<CouplingSettings> = {}): CouplingSettings {
  return {
    couplingStrength: 1,
    maxFeedback: 1,
    reducedMotion: false,
    safeMode: false,
    ...overrides,
  }
}

describe('disabled audiovisual coupling', () => {
  it.each([
    ['coupling strength', settings({ couplingStrength: 0 })],
    ['feedback bound', settings({ maxFeedback: 0 })],
  ])('emits no overrides when %s makes effective strength zero', (_label, initialSettings) => {
    const engine = createCouplingEngine(profile, initialSettings)

    expect(engine.step(1, audioMetrics, videoMetrics, { '0.amount': 0.27 })).toEqual({
      video: {},
      audio: {},
    })
  })

  it('resumes smoothly from the latest base value after coupling is toggled off', () => {
    const engine = createCouplingEngine(profile, settings())
    const enabled = engine.step(10, audioMetrics, videoMetrics, { '0.amount': 0.2 })
    const enabledAmount = enabled.video['0.amount']
    expect(enabledAmount).toBeGreaterThan(0.2)

    engine.setSettings(settings({ couplingStrength: 0 }))
    expect(engine.step(1 / 60, audioMetrics, videoMetrics, { '0.amount': 0.31 })).toEqual({
      video: {},
      audio: {},
    })

    engine.setSettings(settings({ couplingStrength: 1 }))
    const resumed = engine.step(0.01, audioMetrics, videoMetrics, { '0.amount': 0.31 })
    expect(resumed.video['0.amount']).toBeGreaterThan(0.31)
    expect(resumed.video['0.amount']).toBeLessThan(enabledAmount)
  })
})
