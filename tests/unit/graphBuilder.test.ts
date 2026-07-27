import { describe, expect, it } from 'vitest'

import { buildVideoNodes } from '../../src/conditions/graphBuilder'
import { makeTestProfile } from '../helpers/profileFixtures'

describe('conditions/graphBuilder', () => {
  it('skips unknown nodes and builds known nodes', () => {
    const profile = makeTestProfile({
      video_stack: [
        { node: 'unknown_node', params: { amount: 1 } },
        { node: 'grain', params: { amount: 0.2 } },
      ],
    })

    const nodes = buildVideoNodes(profile, { reducedMotion: false })
    expect(nodes.length).toBe(1)
  })
})
