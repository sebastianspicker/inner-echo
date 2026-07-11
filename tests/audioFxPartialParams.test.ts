import { describe, expect, it } from 'vitest'

import { FakeAudioContext } from '../src/contractVerification/fakeAudioContext'
import { createDelay } from '../src/engine/audio/fx/delay'
import { createFlutter } from '../src/engine/audio/fx/flutter'
import { createPulseTone } from '../src/engine/audio/fx/pulseTone'
import { createReverb } from '../src/engine/audio/fx/reverb'

function fakeContext(): BaseAudioContext {
  return new FakeAudioContext() as unknown as BaseAudioContext
}

describe('audio FX partial reactive params', () => {
  it('delay preserves profile time and feedback when only mix is modulated', () => {
    const ctx = fakeContext() as BaseAudioContext & FakeAudioContext
    const mark = ctx.mark()
    const mod = createDelay(ctx, { time: 0.22, feedback: 0.11, mix: 0.04 })
    const created = ctx.collectSince(mark)

    mod.setParams({ mix: 0.09 })

    expect(created.delays[0].delayTime.value).toBeCloseTo(0.22)
    expect(created.gains[4].gain.value).toBeCloseTo(0.11)
    expect(created.gains[2].gain.value).toBeCloseTo(0.09)
  })

  it('reverb preserves profile decay when only mix is modulated', () => {
    const ctx = fakeContext() as BaseAudioContext & FakeAudioContext
    const mark = ctx.mark()
    const mod = createReverb(ctx, { mix: 0.04, decay: 2.2 })
    const created = ctx.collectSince(mark)
    const initialLength = created.convolvers[0].buffer?.length

    mod.setParams({ mix: 0.08 })

    expect(created.gains[2].gain.value).toBeCloseTo(0.08)
    expect(created.convolvers[0].buffer?.length).toBe(initialLength)
  })

  it('pulse tone preserves rate and base frequency when only mix is modulated', () => {
    const ctx = fakeContext() as BaseAudioContext & FakeAudioContext
    const mark = ctx.mark()
    const mod = createPulseTone(ctx, { rate: 2.4, mix: 0.03, base_freq: 180 })
    const created = ctx.collectSince(mark)

    mod.setParams({ mix: 0.08 })

    expect(created.oscillators[1].frequency.value).toBeCloseTo(2.4)
    expect(created.oscillators[0].frequency.value).toBeCloseTo(180)
    expect(created.constantSources[0].offset.value * 2).toBeCloseTo(0.08)
  })

  it('flutter preserves depth when only rate is modulated', () => {
    const ctx = fakeContext() as BaseAudioContext & FakeAudioContext
    const mark = ctx.mark()
    const mod = createFlutter(ctx, { rate: 0.5, depth: 0.09 })
    const created = ctx.collectSince(mark)

    mod.setParams({ rate: 0.9 })

    expect(created.oscillators[0].frequency.value).toBeCloseTo(0.9)
    expect(created.gains[2].gain.value).toBeCloseTo(0.09 * 0.006)
  })
})
