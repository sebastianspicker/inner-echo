import { describe, expect, it } from 'vitest'

import { resolveAnalyserTarget } from '../../src/engine/reactive/analyserToParamsResolver'
import { makeTestProfile } from '../helpers/profileFixtures'

describe('reactive/analyserToParamsResolver', () => {
  it('resolves video targets to builtIndex.param', () => {
    const profile = makeTestProfile({
      video_stack: [{ node: 'grain', id: 'grain', params: { amount: 0.2 } }],
    })

    const res = resolveAnalyserTarget('video.grain.amount', profile, { reducedMotion: false })
    expect(res?.kind).toBe('video')
    expect(res?.paramKey).toBe('0.amount')
  })

  it('resolves audio targets to audio.<chainIndex>.<param>', () => {
    const profile = makeTestProfile({
      video_stack: [],
      audio_stack: {
        enabled: true,
        chain: [{ node: 'tremolo', id: 'tremolo', params: { depth: 0.1 } }],
      },
    })

    const res = resolveAnalyserTarget('audio.tremolo.depth', profile, { reducedMotion: false })
    expect(res?.kind).toBe('audio')
    expect(res?.paramKey).toBe('audio.0.depth')
  })
})
