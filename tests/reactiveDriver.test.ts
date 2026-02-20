import { describe, expect, it } from 'vitest'

import { createReactiveDriver } from '../src/engine/reactive/reactiveDriver'

describe('engine/reactive/reactiveDriver', () => {
  it('normalizes reversed clamp ranges instead of pinning output', () => {
    const profile = {
      id: 't',
      label: 't',
      summary: 't',
      framing: { type: 'metaphor' },
      experience_dimensions: [],
      video_stack: [{ node: 'grain', params: { amount: 0 } }],
      safety: {
        intensity_default: 0.5,
        intensity_max: 1,
        warnings: [],
        safe_mode_clamps: {},
      },
      reactive: {
        analyser_to_params: [
          {
            source: 'rms',
            target: 'video.grain.amount',
            scale: 1,
            offset: 0,
            clamp: [1, 0],
            smoothing: { attack: 0, release: 0 },
          },
        ],
      },
    } as any

    const driver = createReactiveDriver(profile)
    const low = driver.getVideoOverrides(1 / 60, 0.1)['0.amount']
    const high = driver.getVideoOverrides(1 / 60, 0.9)['0.amount']
    expect(low).toBeGreaterThanOrEqual(0)
    expect(high).toBeLessThanOrEqual(1)
    expect(high).toBeGreaterThan(low)
  })
})

