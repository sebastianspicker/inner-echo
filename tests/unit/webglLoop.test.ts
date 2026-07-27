import { describe, expect, it } from 'vitest'

import { computeNextRenderScaleIndex } from '../../src/engine/canvas/webgl/loop'

const DEFAULT_RENDER_SCALE_INPUT = {
  currentIndex: 0,
  scaleCount: 3,
  avgFps: 60,
  stressMode: false,
  prevStressMode: false,
  nowMs: 2000,
  lastScaleChangeMs: 0,
  cooldownMs: 900,
  downThreshold: 28,
  upThreshold: 33,
}

function nextRenderScale(
  overrides: Partial<Parameters<typeof computeNextRenderScaleIndex>[0]>,
): number {
  return computeNextRenderScaleIndex({ ...DEFAULT_RENDER_SCALE_INPUT, ...overrides })
}

describe('engine/canvas/webgl/loop', () => {
  it('does not change scale before cooldown elapsed', () => {
    const next = nextRenderScale({ avgFps: 20, nowMs: 1000, lastScaleChangeMs: 500 })
    expect(next).toBe(0)
  })

  it('scales down under stress mode', () => {
    const next = nextRenderScale({ stressMode: true })
    expect(next).toBe(1)
  })

  it('scales up when fps recovers above threshold', () => {
    const next = nextRenderScale({ currentIndex: 2, avgFps: 45 })
    expect(next).toBe(1)
  })

  it('clamps index within available scales', () => {
    const down = nextRenderScale({ currentIndex: 2, avgFps: 10 })
    const up = nextRenderScale({ avgFps: 40 })
    expect(down).toBe(2)
    expect(up).toBe(0)
  })

  it('resets renderScaleIndex to 0 when stress mode is toggled off', () => {
    const next = nextRenderScale({ currentIndex: 2, avgFps: 15, prevStressMode: true })
    expect(next).toBe(0)
  })
})
