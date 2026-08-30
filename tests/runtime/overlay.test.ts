import { describe, expect, it } from 'vitest'

import { createCouplingEngine } from '../../src/runtime/coupling/couplingEngine'
import { createOverlayRuntime } from '../../src/runtime/visual/overlay/overlayRuntime'
import { profileSchema } from '../../src/domain/experience/schema'

describe('runtime contracts', () => {
  it('reports unavailable overlay state without activating rendering', () => {
    const states: string[] = []
    const runtime = createOverlayRuntime(
      { video: null, webglCanvas: null, fallbackCanvas: null, container: null },
      { onStateChange: (state) => states.push(state.rendererMode) },
    )

    runtime.reportUnavailable()

    expect(states).toEqual(['unavailable'])
    expect(runtime.control.getDiagnostics?.()).toMatchObject({
      rendererMode: 'unavailable',
      effectsActive: false,
      activeVideoNodes: [],
    })
  })

  it('bounds coupling output when live metrics exceed the node limit', () => {
    const engine = createCouplingEngine(
      profileSchema.parse({
        id: 'coupling-fixture',
        label: 'Coupling fixture',
        summary: 'A pure runtime fixture.',
        framing: { type: 'metaphor' },
        experience_dimensions: [],
        video_stack: [{ node: 'grain', params: { amount: 0.49 } }],
        safety: {
          intensity_default: 0.3,
          intensity_max: 0.8,
          warnings: [],
          safe_mode_clamps: {},
        },
      }),
      { couplingStrength: 1, maxFeedback: 1, reducedMotion: false, safeMode: false },
    )

    const result = engine.step(
      10,
      { rms: 1, centroid: 1, flux: 1 },
      { motion: 1, luminance: 1, edge: 1, instability: 1 },
      {},
    )

    expect(result.video['0.amount']).toBe(0.5)
  })
})
