import { describe, expect, it } from 'vitest'

import { buildVideoNodes } from '../src/conditions/graphBuilder'

describe('conditions/graphBuilder', () => {
  it('skips unknown nodes and builds known nodes', () => {
    const profile = {
      id: 't',
      label: 't',
      summary: 't',
      framing: { type: 'metaphor' },
      experience_dimensions: [],
      video_stack: [
        { node: 'unknown_node', params: { amount: 1 } },
        { node: 'grain', params: { amount: 0.2 } },
      ],
      safety: {
        intensity_default: 0.5,
        intensity_max: 1,
        warnings: [],
        safe_mode_clamps: {},
      },
    } as any

    const nodes = buildVideoNodes(profile, { reducedMotion: false })
    expect(nodes.length).toBe(1)
  })
})
