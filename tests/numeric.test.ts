import { describe, expect, it } from 'vitest'

import { clamp, clamp01, smoothStep } from '../src/utils/numeric'

describe('utils/numeric', () => {
  describe('clamp', () => {
    it('clamps value below min to min', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
    })

    it('clamps value above max to max', () => {
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('returns value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
    })

    it('handles NaN — Math.max/Math.min propagates NaN', () => {
      // Math.max(0, Math.min(10, NaN)) -> Math.max(0, NaN) -> NaN
      const result = clamp(NaN, 0, 10)
      expect(Number.isNaN(result)).toBe(true)
    })

    it('handles Infinity', () => {
      expect(clamp(Infinity, 0, 10)).toBe(10)
      expect(clamp(-Infinity, 0, 10)).toBe(0)
    })

    it('handles negative range', () => {
      expect(clamp(0, -10, -5)).toBe(-5)
      expect(clamp(-7, -10, -5)).toBe(-7)
      expect(clamp(-12, -10, -5)).toBe(-10)
    })

    it('handles min equal to max', () => {
      expect(clamp(5, 3, 3)).toBe(3)
      expect(clamp(1, 3, 3)).toBe(3)
    })
  })

  describe('clamp01', () => {
    it('clamps value to [0, 1] range', () => {
      expect(clamp01(0.5)).toBe(0.5)
      expect(clamp01(0)).toBe(0)
      expect(clamp01(1)).toBe(1)
    })

    it('clamps negative to 0', () => {
      expect(clamp01(-0.5)).toBe(0)
      expect(clamp01(-100)).toBe(0)
    })

    it('clamps above 1 to 1', () => {
      expect(clamp01(1.5)).toBe(1)
      expect(clamp01(100)).toBe(1)
    })

    it('returns 0 for NaN', () => {
      expect(clamp01(NaN)).toBe(0)
    })

    it('returns 0 for Infinity', () => {
      expect(clamp01(Infinity)).toBe(0)
      expect(clamp01(-Infinity)).toBe(0)
    })

    it('boundary: 0 stays 0, 1 stays 1', () => {
      expect(clamp01(0)).toBe(0)
      expect(clamp01(1)).toBe(1)
    })
  })

  describe('smoothStep', () => {
    it('returns target when tau is 0 (instant snap)', () => {
      // tau <= 0 => returns target immediately
      expect(smoothStep(0, 1, 0.016, 0, 0)).toBe(1)
      expect(smoothStep(1, 0, 0.016, 0, 0)).toBe(0)
    })

    it('approaches target with positive dt', () => {
      const result = smoothStep(0, 1, 0.1, 0.05, 0.05)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(1)
    })

    it('stays at current when dt is 0', () => {
      const result = smoothStep(0.5, 1, 0, 0.1, 0.1)
      // t = 1 - exp(0) = 0, so result = 0.5 + (1 - 0.5) * 0 = 0.5
      expect(result).toBeCloseTo(0.5)
    })

    it('uses attack tau when target > current', () => {
      // Attack = 0.01 (fast), release = 10 (slow)
      const resultUp = smoothStep(0, 1, 0.1, 0.01, 10)
      // Should move quickly towards target
      expect(resultUp).toBeGreaterThan(0.9)
    })

    it('uses release tau when target < current', () => {
      // Attack = 10 (slow), release = 0.01 (fast)
      const resultDown = smoothStep(1, 0, 0.1, 10, 0.01)
      // Should move quickly towards target
      expect(resultDown).toBeLessThan(0.1)
    })

    it('converges towards target over many steps', () => {
      let value = 0
      for (let i = 0; i < 100; i++) {
        value = smoothStep(value, 1, 0.016, 0.05, 0.05)
      }
      expect(value).toBeCloseTo(1, 2)
    })

    it('handles equal current and target (no change)', () => {
      const result = smoothStep(0.5, 0.5, 0.1, 0.05, 0.05)
      expect(result).toBeCloseTo(0.5)
    })
  })
})
