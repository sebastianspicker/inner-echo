import { describe, expect, it } from 'vitest'

import { clampIntensity, getReducedMotionDisableNodes } from '../../src/conditions/normalize'
import { makeTestProfile } from '../helpers/profileFixtures'

describe('conditions/normalize', () => {
  it('clampIntensity clamps to [0, min(profileMax, safeModeMax)]', () => {
    const profile = makeTestProfile({
      safety: {
        intensity_default: 0.5,
        intensity_max: 0.6,
        warnings: [],
        safe_mode_clamps: { max_intensity: 0.4 },
      },
    })

    expect(clampIntensity(profile, 0.9, false)).toBeCloseTo(0.6)
    expect(clampIntensity(profile, 0.9, true)).toBeCloseTo(0.4)
    expect(clampIntensity(profile, -1, false)).toBeCloseTo(0)
    expect(clampIntensity(profile, Number.NaN, false)).toBeCloseTo(0)
  })

  it('getReducedMotionDisableNodes lowercases and returns a set', () => {
    const profile = makeTestProfile({
      safety: {
        intensity_default: 0.5,
        intensity_max: 1,
        warnings: [],
        safe_mode_clamps: {},
        reduced_motion_policy: { disable_nodes: ['Temporal_Smear', 'PULSE'] },
      },
    })

    const s = getReducedMotionDisableNodes(profile)
    expect(s.has('temporal_smear')).toBe(true)
    expect(s.has('pulse')).toBe(true)
  })
})
