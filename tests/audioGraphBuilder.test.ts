import { describe, expect, it } from 'vitest'

import { buildAudioChain } from '../src/engine/audio/audioGraphBuilder'
import { FakeAudioContext } from '../src/contractVerification/fakeAudioContext'

describe('engine/audio/audioGraphBuilder', () => {
  it('builds known audio nodes case-insensitively', () => {
    const ctx = new FakeAudioContext()
    const chain = buildAudioChain(ctx as unknown as BaseAudioContext, {
      enabled: true,
      chain: [
        { node: 'Lowpass', params: { cutoff: 900 } },
        { node: 'TREMolo', params: { rate: 1 } },
      ],
    })
    expect(chain).toHaveLength(2)
    chain.forEach((m) => m.dispose())
  })
})
