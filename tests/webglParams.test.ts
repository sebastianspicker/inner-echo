import { describe, expect, it } from 'vitest'

import {
  computeUvScaleOffset,
  mergeControlValues,
  resolveReactiveOverrides,
} from '../src/engine/canvas/webgl/params'

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

  it('normalizes legacy video-only reactive overrides', () => {
    const result = resolveReactiveOverrides({
      good: 1,
      badBool: true,
      badString: 'x',
    })
    expect(result.video).toEqual({ good: 1 })
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
})
