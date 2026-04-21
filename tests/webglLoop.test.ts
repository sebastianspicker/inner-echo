import { describe, expect, it } from 'vitest'

import { computeNextRenderScaleIndex } from '../src/engine/canvas/webgl/loop'

describe('engine/canvas/webgl/loop', () => {
  it('does not change scale before cooldown elapsed', () => {
    const next = computeNextRenderScaleIndex({
      currentIndex: 0,
      scaleCount: 3,
      avgFps: 20,
      stressMode: false,
      prevStressMode: false,
      nowMs: 1000,
      lastScaleChangeMs: 500,
      cooldownMs: 900,
      downThreshold: 28,
      upThreshold: 33,
    })
    expect(next).toBe(0)
  })

  it('scales down under stress mode', () => {
    const next = computeNextRenderScaleIndex({
      currentIndex: 0,
      scaleCount: 3,
      avgFps: 60,
      stressMode: true,
      prevStressMode: false,
      nowMs: 2000,
      lastScaleChangeMs: 0,
      cooldownMs: 900,
      downThreshold: 28,
      upThreshold: 33,
    })
    expect(next).toBe(1)
  })

  it('scales up when fps recovers above threshold', () => {
    const next = computeNextRenderScaleIndex({
      currentIndex: 2,
      scaleCount: 3,
      avgFps: 45,
      stressMode: false,
      prevStressMode: false,
      nowMs: 2000,
      lastScaleChangeMs: 0,
      cooldownMs: 900,
      downThreshold: 28,
      upThreshold: 33,
    })
    expect(next).toBe(1)
  })

  it('clamps index within available scales', () => {
    const down = computeNextRenderScaleIndex({
      currentIndex: 2,
      scaleCount: 3,
      avgFps: 10,
      stressMode: false,
      prevStressMode: false,
      nowMs: 2000,
      lastScaleChangeMs: 0,
      cooldownMs: 900,
      downThreshold: 28,
      upThreshold: 33,
    })
    const up = computeNextRenderScaleIndex({
      currentIndex: 0,
      scaleCount: 3,
      avgFps: 40,
      stressMode: false,
      prevStressMode: false,
      nowMs: 2000,
      lastScaleChangeMs: 0,
      cooldownMs: 900,
      downThreshold: 28,
      upThreshold: 33,
    })
    expect(down).toBe(2)
    expect(up).toBe(0)
  })

  it('resets renderScaleIndex to 0 when stress mode is toggled off', () => {
    const next = computeNextRenderScaleIndex({
      currentIndex: 2,
      scaleCount: 3,
      avgFps: 15,
      stressMode: false,
      prevStressMode: true,
      nowMs: 2000,
      lastScaleChangeMs: 0,
      cooldownMs: 900,
      downThreshold: 28,
      upThreshold: 33,
    })
    expect(next).toBe(0)
  })
})
