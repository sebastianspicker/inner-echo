import { describe, expect, it } from 'vitest'

import { getDefaultControlValues, resolveControl } from '../src/conditions/controlTargets'
import type { Profile, UIControl } from '../src/conditions/schema'

function makeProfile(): Profile {
  return {
    id: 'reduced-motion-fixture',
    label: 'Reduced Motion Fixture',
    summary: 'Fixture profile for control resolution tests',
    framing: { type: 'metaphor' },
    experience_dimensions: [],
    safety: {
      intensity_default: 0.5,
      intensity_max: 1,
      warnings: [],
      safe_mode_clamps: {},
      reduced_motion_policy: { disable_nodes: ['focus_jitter', 'pulse'] },
    },
    video_stack: [
      { id: 'focus', node: 'focus_jitter', params: { amount: 0.08 } },
      { id: 'edge', node: 'edge_sharpen', params: { amount: 0.12 } },
      { id: 'grain', node: 'grain', params: { amount: 0.2 } },
    ],
    audio_stack: { enabled: false, chain: [] },
    reactive: { analyser_to_params: [] },
    ui: { controls: [] },
    references: { dimensions: [] },
  }
}

function makeSliderControl(id: string, target: string): UIControl {
  return {
    id,
    type: 'slider',
    label: id,
    min: 0,
    max: 1,
    step: 0.01,
    target,
  }
}

describe('conditions/controlTargets', () => {
  it('keeps control mapping aligned with the reduced-motion built index', () => {
    const profile = makeProfile()

    const resolved = resolveControl(
      makeSliderControl('sharpen', 'video.edge_sharpen.amount'),
      profile,
      { reducedMotion: true },
    )

    expect(resolved).not.toBeNull()
    expect(resolved?.paramKey).toBe('0.amount')
    expect(resolved?.nodeIndex).toBe(0)
    expect(resolved?.defaultValue).toBe(0.12)
  })

  it('returns null when reduced motion removes the targeted node', () => {
    const profile = makeProfile()

    const resolved = resolveControl(
      makeSliderControl('jitter', 'video.focus_jitter.amount'),
      profile,
      { reducedMotion: true },
    )

    expect(resolved).toBeNull()
  })

  it('seeds every built video stack param as default control values', () => {
    const profile = makeProfile()

    const defaults = getDefaultControlValues(profile)

    expect(defaults['0.amount']).toBe(0.08)
    expect(defaults['1.amount']).toBe(0.12)
    expect(defaults['2.amount']).toBe(0.2)
  })

  it('reindexes seeded video stack defaults when reduced motion removes nodes', () => {
    const profile = makeProfile()

    const defaults = getDefaultControlValues(profile, { reducedMotion: true })

    expect(defaults['0.amount']).toBe(0.12)
    expect(defaults['1.amount']).toBe(0.2)
    expect(defaults['2.amount']).toBeUndefined()
  })
})
