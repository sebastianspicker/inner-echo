import { describe, expect, it } from 'vitest'

import { resolveAnalyserTarget } from '../src/engine/reactive/analyserToParamsResolver'

describe('reactive/analyserToParamsResolver', () => {
  it('resolves video targets to builtIndex.param', () => {
    const profile = {
      id: 't',
      label: 't',
      summary: 't',
      framing: { type: 'metaphor' },
      experience_dimensions: [],
      video_stack: [{ node: 'grain', id: 'grain', params: { amount: 0.2 } }],
      safety: {
        intensity_default: 0.5,
        intensity_max: 1,
        warnings: [],
        safe_mode_clamps: {},
      },
    } as any

    const res = resolveAnalyserTarget('video.grain.amount', profile, { reducedMotion: false })
    expect(res?.kind).toBe('video')
    expect(res?.paramKey).toBe('0.amount')
  })

  it('resolves audio targets to audio.<chainIndex>.<param>', () => {
    const profile = {
      id: 't',
      label: 't',
      summary: 't',
      framing: { type: 'metaphor' },
      experience_dimensions: [],
      video_stack: [],
      audio_stack: {
        enabled: true,
        chain: [{ node: 'tremolo', id: 'tremolo', params: { depth: 0.1 } }],
      },
      safety: {
        intensity_default: 0.5,
        intensity_max: 1,
        warnings: [],
        safe_mode_clamps: {},
      },
    } as any

    const res = resolveAnalyserTarget('audio.tremolo.depth', profile, { reducedMotion: false })
    expect(res?.kind).toBe('audio')
    expect(res?.paramKey).toBe('audio.0.depth')
  })
})
