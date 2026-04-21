import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

import { InterferenceNode } from '../src/engine/effects/interferenceNode'
import type { VideoNodeParams } from '../src/engine/effects/VideoNode'

function dummyTexture(): THREE.Texture {
  return new THREE.Texture()
}

function defaultParams(overrides?: Partial<VideoNodeParams>): VideoNodeParams {
  return {
    intensity: 1,
    safeMode: false,
    controlValues: {},
    nodeIndex: 0,
    ...overrides,
  }
}

describe('engine/effects/interferenceNode burst scheduling', () => {
  it('burstTimer counts down and sets u_burst > 0 while active', () => {
    const node = new InterferenceNode()
    const mat = node.getMaterial(dummyTexture()) as THREE.ShaderMaterial

    // Set burst_probability=1 to guarantee a burst triggers, and a short gap timer = 0
    node.setParams(
      defaultParams({
        controlValues: {
          '0.amount': 0.1,
          '0.burst_probability': 1,
          '0.burst_duration_ms': 200,
          '0.burst_min_gap_ms': 350,
        },
      }),
    )

    // Force a burst by ticking with a very large delta so Math.random() < p is guaranteed
    vi.spyOn(Math, 'random').mockReturnValue(0)
    node.tick(1) // delta=1s → p = clamp(1 * 1, 0, 0.5) = 0.5 → 0 < 0.5 → burst starts
    vi.restoreAllMocks()

    // After the burst is triggered, u_burst should be > 0 on the next tick
    node.tick(0.05)
    expect(mat.uniforms.u_burst.value).toBeGreaterThan(0)

    node.dispose()
  })

  it('u_burst returns to 0 after burst duration elapses', () => {
    const node = new InterferenceNode()
    const mat = node.getMaterial(dummyTexture()) as THREE.ShaderMaterial

    node.setParams(
      defaultParams({
        controlValues: {
          '0.amount': 0.1,
          '0.burst_probability': 1,
          '0.burst_duration_ms': 180,
          '0.burst_min_gap_ms': 350,
        },
      }),
    )

    // Trigger burst
    vi.spyOn(Math, 'random').mockReturnValue(0)
    node.tick(1)
    vi.restoreAllMocks()

    // Tick past the full burst duration (0.18s)
    node.tick(0.2)
    expect(mat.uniforms.u_burst.value).toBe(0)

    node.dispose()
  })

  it('enforces min gap: no new burst fires while gap timer > 0', () => {
    const node = new InterferenceNode()
    const mat = node.getMaterial(dummyTexture()) as THREE.ShaderMaterial

    node.setParams(
      defaultParams({
        controlValues: {
          '0.amount': 0.1,
          '0.burst_probability': 1,
          '0.burst_duration_ms': 100,
          '0.burst_min_gap_ms': 2000, // 2s gap
        },
      }),
    )

    // Trigger a burst and let it fully expire
    vi.spyOn(Math, 'random').mockReturnValue(0)
    node.tick(1)
    vi.restoreAllMocks()
    node.tick(0.15) // burst expires

    // Gap timer is now set; even with probability=1 and random=0 no burst should fire
    vi.spyOn(Math, 'random').mockReturnValue(0)
    node.tick(0.05) // gap still running
    vi.restoreAllMocks()

    expect(mat.uniforms.u_burst.value).toBe(0)

    node.dispose()
  })

  it('gap timer counts down and allows a new burst after expiry', () => {
    const node = new InterferenceNode()
    const mat = node.getMaterial(dummyTexture()) as THREE.ShaderMaterial

    node.setParams(
      defaultParams({
        controlValues: {
          '0.amount': 0.1,
          '0.burst_probability': 1,
          '0.burst_duration_ms': 100,
          '0.burst_min_gap_ms': 350,
        },
      }),
    )

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    node.tick(1) // burst starts (burstTimer = 0.12)
    randomSpy.mockReturnValue(1)

    // Drain burst with small ticks to avoid retriggering inside a single big tick
    for (let i = 0; i < 10; i++) node.tick(0.02) // 0.2s total → burst (0.12s) expires, gapTimer=0.35
    expect(mat.uniforms.u_burst.value).toBe(0) // burst done

    // Drain gap timer with small ticks
    for (let i = 0; i < 20; i++) node.tick(0.02) // 0.4s → gap (0.35s) expires

    randomSpy.mockReturnValue(0)
    node.tick(0.02) // p = clamp(1*0.02, 0, 0.5)=0.02 → 0 < 0.02 → burst starts
    randomSpy.mockRestore()

    node.tick(0.01) // into burst → u_burst > 0
    expect(mat.uniforms.u_burst.value).toBeGreaterThan(0)

    node.dispose()
  })

  it('envelope is in first-half (fade-in) at burst start', () => {
    const node = new InterferenceNode()
    const mat = node.getMaterial(dummyTexture()) as THREE.ShaderMaterial

    node.setParams(
      defaultParams({
        controlValues: {
          '0.amount': 0.1,
          '0.burst_probability': 1,
          '0.burst_duration_ms': 400,
          '0.burst_min_gap_ms': 350,
        },
      }),
    )

    // Trigger burst
    vi.spyOn(Math, 'random').mockReturnValue(0)
    node.tick(1)
    vi.restoreAllMocks()

    // Tick a small fraction of the burst duration (should be in fade-in half)
    node.tick(0.05)
    const burstValue = mat.uniforms.u_burst.value
    expect(burstValue).toBeGreaterThan(0)
    expect(burstValue).toBeLessThanOrEqual(1)

    node.dispose()
  })
})
