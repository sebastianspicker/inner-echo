import { describe, expect, it } from 'vitest'

import { FX_FACTORY } from '../../src/runtime/audio/audioGraphBuilder'
import {
  AUDIO_NODE_IDS,
  IMPLEMENTED_AUDIO_NODES,
  IMPLEMENTED_VIDEO_NODES,
  VIDEO_NODE_IDS,
} from '../../src/runtime/capabilities'
import { NODE_FACTORY } from '../../src/runtime/visual/graph/videoNodeFactory'

describe('runtime capability metadata', () => {
  it('matches every executable video factory exactly', () => {
    expect(Object.keys(NODE_FACTORY).sort()).toEqual([...VIDEO_NODE_IDS].sort())
    expect([...IMPLEMENTED_VIDEO_NODES].sort()).toEqual([...VIDEO_NODE_IDS].sort())
  })

  it('matches every executable audio factory exactly', () => {
    expect(Object.keys(FX_FACTORY).sort()).toEqual([...AUDIO_NODE_IDS].sort())
    expect([...IMPLEMENTED_AUDIO_NODES].sort()).toEqual([...AUDIO_NODE_IDS].sort())
  })
})
