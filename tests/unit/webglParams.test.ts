import { describe, expect, it } from 'vitest'

import {
  computeUvScaleOffset,
  mergeControlValues,
  resolveReactiveOverrides,
  writeUvScaleOffset,
  writeMergedControlValues,
} from '../../src/engine/canvas/webgl/params'

describe('engine/canvas/webgl/params', () => {
  it('returns neutral UV mapping for invalid dimensions', () => {
    const result = computeUvScaleOffset(0, 0, 1920, 1080)
    expect(result).toEqual({
      uvScale: [1, 1],
      uvOffset: [0, 0],
    })
  })

  it('computes cover-crop UV mapping for wider canvas', () => {
    const result = computeUvScaleOffset(640, 480, 1920, 1080)
    expect(result.uvScale[0]).toBeCloseTo(1)
    expect(result.uvScale[1]).toBeCloseTo(0.75)
    expect(result.uvOffset[0]).toBeCloseTo(0)
    expect(result.uvOffset[1]).toBeCloseTo(0.125)
  })

  it('normalizes structured reactive overrides', () => {
    const result = resolveReactiveOverrides({
      video: { v1: 0.5, v2: Number.NaN },
      audio: { a1: 0.3, a2: Number.POSITIVE_INFINITY },
    })
    expect(result.video).toEqual({ v1: 0.5 })
    expect(result.audio).toEqual({ a1: 0.3 })
  })

  it('ignores legacy video-only reactive overrides', () => {
    const result = resolveReactiveOverrides({
      good: 1,
      badBool: true,
      badString: 'x',
    })
    expect(result.video).toEqual({})
    expect(result.audio).toBeNull()
  })

  it('merges base values with video overrides without mutating inputs', () => {
    const base = { a: 1, b: true }
    const video = { a: 2, c: 3 }
    const merged = mergeControlValues(base, video)

    expect(merged).toEqual({ a: 2, b: true, c: 3 })
    expect(base).toEqual({ a: 1, b: true })
    expect(video).toEqual({ a: 2, c: 3 })
  })

  describe('writeUvScaleOffset', () => {
    it('writes neutral values for zero width/height (no NaN/Infinity)', () => {
      const outScale: [number, number] = [0, 0]
      const outOffset: [number, number] = [0, 0]
      writeUvScaleOffset(0, 0, 1920, 1080, outScale, outOffset)
      expect(outScale).toEqual([1, 1])
      expect(outOffset).toEqual([0, 0])
      expect(Number.isFinite(outScale[0])).toBe(true)
      expect(Number.isFinite(outScale[1])).toBe(true)
    })

    it('writes neutral values for zero canvas dimensions', () => {
      const outScale: [number, number] = [0, 0]
      const outOffset: [number, number] = [0, 0]
      writeUvScaleOffset(640, 480, 0, 0, outScale, outOffset)
      expect(outScale).toEqual([1, 1])
      expect(outOffset).toEqual([0, 0])
    })

    it('handles landscape video on landscape canvas (wider canvas)', () => {
      const outScale: [number, number] = [0, 0]
      const outOffset: [number, number] = [0, 0]
      writeUvScaleOffset(640, 480, 1920, 1080, outScale, outOffset)
      // Canvas aspect (16:9=1.78) > Video aspect (4:3=1.33) → scale[0]=1, scale[1]<1
      expect(outScale[0]).toBeCloseTo(1)
      expect(outScale[1]).toBeLessThan(1)
      expect(outOffset[0]).toBeCloseTo(0)
      expect(outOffset[1]).toBeGreaterThan(0)
    })

    it('handles portrait video on landscape canvas', () => {
      const outScale: [number, number] = [0, 0]
      const outOffset: [number, number] = [0, 0]
      writeUvScaleOffset(480, 640, 1920, 1080, outScale, outOffset)
      // Canvas aspect (1.78) > Video aspect (0.75) → scale[0]=1, scale[1]<1
      expect(outScale[0]).toBeCloseTo(1)
      expect(outScale[1]).toBeLessThan(1)
    })

    it('handles landscape video on portrait canvas', () => {
      const outScale: [number, number] = [0, 0]
      const outOffset: [number, number] = [0, 0]
      writeUvScaleOffset(1920, 1080, 480, 640, outScale, outOffset)
      // Canvas aspect (0.75) < Video aspect (1.78) → scale[0]<1, scale[1]=1
      expect(outScale[0]).toBeLessThan(1)
      expect(outScale[1]).toBeCloseTo(1)
      expect(outOffset[0]).toBeGreaterThan(0)
      expect(outOffset[1]).toBeCloseTo(0)
    })

    it('equal aspect ratios produce no offset', () => {
      const outScale: [number, number] = [0, 0]
      const outOffset: [number, number] = [0, 0]
      writeUvScaleOffset(640, 480, 320, 240, outScale, outOffset)
      expect(outScale[0]).toBeCloseTo(1)
      expect(outScale[1]).toBeCloseTo(1)
      expect(outOffset[0]).toBeCloseTo(0)
      expect(outOffset[1]).toBeCloseTo(0)
    })
  })

  describe('resolveReactiveOverrides (additional)', () => {
    it('handles nested video/audio override objects', () => {
      const result = resolveReactiveOverrides({
        video: { brightness: 0.7, contrast: 1.2 },
        audio: { volume: 0.5 },
      })
      expect(result.video).toEqual({ brightness: 0.7, contrast: 1.2 })
      expect(result.audio).toEqual({ volume: 0.5 })
    })

    it('returns null audio when audio override object is empty', () => {
      const result = resolveReactiveOverrides({
        video: { x: 1 },
        audio: {},
      })
      expect(result.audio).toBeNull()
    })

    it('handles null overrides', () => {
      const result = resolveReactiveOverrides(null)
      expect(result.video).toEqual({})
      expect(result.audio).toBeNull()
    })

    it('handles undefined overrides', () => {
      const result = resolveReactiveOverrides(undefined)
      expect(result.video).toEqual({})
      expect(result.audio).toBeNull()
    })

    it('ignores flat override records after structured contract tightening', () => {
      const result = resolveReactiveOverrides({
        good: 1.5,
        nan: NaN,
        inf: Infinity,
        negInf: -Infinity,
      })
      expect(result.video).toEqual({})
    })
  })

  describe('writeMergedControlValues', () => {
    it('merges base and overrides into existing target object', () => {
      const target: Record<string, number | boolean> = { old: 99 }
      writeMergedControlValues(target, { a: 1, b: true }, { a: 2, c: 3 })
      expect(target).toEqual({ a: 2, b: true, c: 3 })
    })

    it('clears previous target keys before merging', () => {
      const target: Record<string, number | boolean> = { stale: 42, leftover: false }
      writeMergedControlValues(target, { fresh: 1 }, {})
      expect(target).toEqual({ fresh: 1 })
      expect('stale' in target).toBe(false)
      expect('leftover' in target).toBe(false)
    })

    it('video overrides take precedence over base', () => {
      const target: Record<string, number | boolean> = {}
      writeMergedControlValues(target, { x: 10 }, { x: 20 })
      expect(target.x).toBe(20)
    })
  })
})
