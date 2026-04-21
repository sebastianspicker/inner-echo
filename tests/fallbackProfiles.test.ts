import { describe, expect, it } from 'vitest'

import { BASELINE_PROFILE, createComposeFallbackProfile } from '../src/conditions/fallbackProfiles'

describe('conditions/fallbackProfiles', () => {
  describe('BASELINE_PROFILE', () => {
    it('has id "none"', () => {
      expect(BASELINE_PROFILE.id).toBe('none')
    })

    it('has empty video_stack and disabled audio_stack', () => {
      expect(BASELINE_PROFILE.video_stack).toEqual([])
      expect(BASELINE_PROFILE.audio_stack.enabled).toBe(false)
    })

    it('has zero intensity defaults', () => {
      expect(BASELINE_PROFILE.safety.intensity_default).toBe(0)
      expect(BASELINE_PROFILE.safety.intensity_max).toBe(0)
    })
  })

  describe('createComposeFallbackProfile', () => {
    it('returns a profile with id "composed_fallback"', () => {
      const profile = createComposeFallbackProfile()
      expect(profile.id).toBe('composed_fallback')
    })

    it('includes the default warning when no argument is given', () => {
      const profile = createComposeFallbackProfile()
      expect(profile.safety.warnings.length).toBeGreaterThan(0)
      expect(profile.safety.warnings[0]).toMatch(/fallback|validation/i)
    })

    it('includes a custom warning when one is provided', () => {
      const custom = 'Custom error: something went very wrong.'
      const profile = createComposeFallbackProfile(custom)
      expect(profile.safety.warnings).toContain(custom)
    })

    it('has a baseline framing type', () => {
      const profile = createComposeFallbackProfile()
      expect(profile.framing.type).toBe('baseline')
    })
  })
})
