import { describe, expect, it } from 'vitest'

import { getInteractionGain } from '../../src/composer/interactionMatrix'

describe('composer/interactionMatrix', () => {
  it('returns 0 when interactionAmount is 0', () => {
    expect(getInteractionGain('hyperarousal', 'intrusion', 0)).toBe(0)
  })

  it('is symmetric in (a,b)', () => {
    const a = getInteractionGain('hyperarousal', 'intrusion', 0.5)
    const b = getInteractionGain('intrusion', 'hyperarousal', 0.5)
    expect(a).toBeCloseTo(b)
  })

  it('clamps interactionAmount and base into [0..1]', () => {
    // Even with out-of-range interactionAmount, result is clamped.
    const g = getInteractionGain('hyperarousal', 'intrusion', 10)
    expect(g).toBeGreaterThanOrEqual(0)
    expect(g).toBeLessThanOrEqual(1)
  })
})
