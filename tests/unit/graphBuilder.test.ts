import { describe, expect, it } from 'vitest'

import {
  buildVideoNodes,
  getBuiltNodeIndex,
  getBuiltVideoStackEntries,
  getProfileEntryForBuiltIndex,
  NODE_FACTORY,
} from '../../src/conditions/graphBuilder'
import { NODE_FACTORY as nodeFactory } from '../../src/conditions/videoNodeFactory'
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

  it('skips entries whose node name is empty', () => {
    const profile = makeTestProfile({
      video_stack: [
        { node: '', params: { amount: 1 } },
        { node: 'grain', params: { amount: 0.2 } },
      ],
    })

    expect(buildVideoNodes(profile)).toHaveLength(1)
  })

  it('keeps the public factory and compacted built-index contract stable', () => {
    const profile = makeTestProfile({
      safety: {
        intensity_default: 0.5,
        intensity_max: 1,
        warnings: [],
        safe_mode_clamps: {},
        reduced_motion_policy: { disable_nodes: ['focus_jitter'] },
      },
      video_stack: [
        { node: 'unknown_node' },
        { id: 'grain-one', node: 'grain' },
        { id: 'focus', node: 'focus_jitter' },
        { id: 'edge', node: 'edge_sharpen' },
      ],
    })

    expect(NODE_FACTORY).toBe(nodeFactory)
    expect(getBuiltVideoStackEntries(profile, { reducedMotion: true })).toEqual([
      { def: profile.video_stack[1], index: 0 },
      { def: profile.video_stack[3], index: 1 },
    ])
    expect(getBuiltNodeIndex(profile, 'edge', { reducedMotion: true })).toBe(1)
    expect(getProfileEntryForBuiltIndex(profile, 1, { reducedMotion: true })).toBe(
      profile.video_stack[3],
    )
  })
})
