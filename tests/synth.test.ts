import { describe, expect, it } from 'vitest'

import { createSynth } from '../src/engine/audio/synth'
import { FakeAudioContext } from '../src/contractVerification/fakeAudioContext'

describe('engine/audio/synth', () => {
  function makeCtx() {
    return new FakeAudioContext() as unknown as BaseAudioContext
  }

  describe('createSynth returns expected API', () => {
    it('returns an object with connect, getInput, setParams, and dispose', () => {
      const ctx = makeCtx()
      const synth = createSynth(ctx)
      expect(typeof synth.connect).toBe('function')
      expect(typeof synth.getInput).toBe('function')
      expect(typeof synth.setParams).toBe('function')
      expect(typeof synth.dispose).toBe('function')
    })

    it('getInput returns an AudioNode (GainNode)', () => {
      const ctx = makeCtx()
      const synth = createSynth(ctx)
      const input = synth.getInput()
      expect(input).toBeDefined()
    })
  })

  describe('default parameters', () => {
    it('creates two oscillators at default frequency 220Hz', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      createSynth(fakeCtx as unknown as BaseAudioContext)
      const nodes = fakeCtx.collectSince(mark)
      expect(nodes.oscillators).toHaveLength(2)
      expect(nodes.oscillators[0].frequency.value).toBe(220)
      expect(nodes.oscillators[1].frequency.value).toBe(220)
    })

    it('second oscillator has default detune of 8 cents', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      createSynth(fakeCtx as unknown as BaseAudioContext)
      const nodes = fakeCtx.collectSince(mark)
      expect(nodes.oscillators[1].detune.value).toBe(8)
    })

    it('does not create noise buffer when noiseLevel is 0 (default)', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      createSynth(fakeCtx as unknown as BaseAudioContext)
      const nodes = fakeCtx.collectSince(mark)
      expect(nodes.bufferSources).toHaveLength(0)
      expect(nodes.buffers).toHaveLength(0)
    })
  })

  describe('custom parameters', () => {
    it('uses provided frequency for both oscillators', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      createSynth(fakeCtx as unknown as BaseAudioContext, { frequency: 440 })
      const nodes = fakeCtx.collectSince(mark)
      expect(nodes.oscillators[0].frequency.value).toBe(440)
      expect(nodes.oscillators[1].frequency.value).toBe(440)
    })

    it('uses provided detune for second oscillator', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      createSynth(fakeCtx as unknown as BaseAudioContext, { detune: 20 })
      const nodes = fakeCtx.collectSince(mark)
      expect(nodes.oscillators[1].detune.value).toBe(20)
    })
  })

  describe('noise buffer generation', () => {
    it('creates a noise buffer and buffer source when noiseLevel > 0', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      createSynth(fakeCtx as unknown as BaseAudioContext, { noiseLevel: 0.5 })
      const nodes = fakeCtx.collectSince(mark)
      expect(nodes.buffers).toHaveLength(1)
      expect(nodes.bufferSources).toHaveLength(1)
      expect(nodes.bufferSources[0].loop).toBe(true)
      expect(nodes.bufferSources[0].started).toBe(true)
    })

    it('noise buffer has correct duration (2 seconds)', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      createSynth(fakeCtx as unknown as BaseAudioContext, { noiseLevel: 0.3 })
      const nodes = fakeCtx.collectSince(mark)
      const buffer = nodes.buffers[0]
      // sampleRate is 48000, duration is 2 seconds → length should be 96000
      expect(buffer.length).toBe(48000 * 2)
      expect(buffer.sampleRate).toBe(48000)
    })

    it('noise buffer contains non-zero float data (pink-ish noise)', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      createSynth(fakeCtx as unknown as BaseAudioContext, { noiseLevel: 0.5 })
      const nodes = fakeCtx.collectSince(mark)
      const buffer = nodes.buffers[0]
      const data = buffer.getChannelData(0)
      expect(data).toBeInstanceOf(Float32Array)
      expect(data.length).toBeGreaterThan(0)
      // At least some values should be non-zero (it's random noise)
      const hasNonZero = Array.from(data.slice(0, 100)).some((v) => v !== 0)
      expect(hasNonZero).toBe(true)
    })

    it('noise gain is scaled by 0.3 factor', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      createSynth(fakeCtx as unknown as BaseAudioContext, { noiseLevel: 0.5 })
      const nodes = fakeCtx.collectSince(mark)
      // The second gain node (after outGain) is the noiseGain
      // outGain gain = 1, noiseGain = noiseLevel * 0.3 = 0.15
      const noiseGain = nodes.gains.find((g) => g.gain.value !== 1)
      expect(noiseGain).toBeDefined()
      expect(noiseGain!.gain.value).toBeCloseTo(0.15)
    })
  })

  describe('setParams', () => {
    it('updates frequency on both oscillators', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      const synth = createSynth(fakeCtx as unknown as BaseAudioContext)
      synth.setParams({ frequency: 330 })
      const nodes = fakeCtx.collectSince(mark)
      expect(nodes.oscillators[0].frequency.value).toBe(330)
      expect(nodes.oscillators[1].frequency.value).toBe(330)
    })

    it('updates detune on second oscillator', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      const synth = createSynth(fakeCtx as unknown as BaseAudioContext)
      synth.setParams({ detune: 15 })
      const nodes = fakeCtx.collectSince(mark)
      expect(nodes.oscillators[1].detune.value).toBe(15)
    })

    it('updates noise gain when noiseLevel is provided and noise is active', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      const synth = createSynth(fakeCtx as unknown as BaseAudioContext, { noiseLevel: 0.5 })
      synth.setParams({ noiseLevel: 0.8 })
      const nodes = fakeCtx.collectSince(mark)
      const noiseGain = nodes.gains.find((g) => g.gain.value !== 1)
      expect(noiseGain).toBeDefined()
      // noiseLevel * 0.3 = 0.8 * 0.3 = 0.24
      expect(noiseGain!.gain.value).toBeCloseTo(0.24)
    })

    it('ignores noiseLevel update when noise is not active', () => {
      const fakeCtx = new FakeAudioContext()
      const synth = createSynth(fakeCtx as unknown as BaseAudioContext) // noiseLevel=0
      // Should not throw
      synth.setParams({ noiseLevel: 0.5 })
    })

    it('ignores non-numeric values', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      const synth = createSynth(fakeCtx as unknown as BaseAudioContext)
      synth.setParams({ frequency: 'bad' as unknown })
      const nodes = fakeCtx.collectSince(mark)
      // Frequency should remain at default
      expect(nodes.oscillators[0].frequency.value).toBe(220)
    })
  })

  describe('dispose', () => {
    it('stops and disconnects all oscillators', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      const synth = createSynth(fakeCtx as unknown as BaseAudioContext)
      synth.dispose()
      const nodes = fakeCtx.collectSince(mark)
      expect(nodes.oscillators[0].stopped).toBe(true)
      expect(nodes.oscillators[1].stopped).toBe(true)
    })

    it('stops and disconnects noise source when active', () => {
      const fakeCtx = new FakeAudioContext()
      const mark = fakeCtx.mark()
      const synth = createSynth(fakeCtx as unknown as BaseAudioContext, { noiseLevel: 0.5 })
      synth.dispose()
      const nodes = fakeCtx.collectSince(mark)
      expect(nodes.bufferSources[0].stopped).toBe(true)
    })

    it('calling dispose twice does not throw', () => {
      const fakeCtx = new FakeAudioContext()
      const synth = createSynth(fakeCtx as unknown as BaseAudioContext, { noiseLevel: 0.5 })
      synth.dispose()
      // Second dispose should not throw thanks to try/catch
      expect(() => synth.dispose()).not.toThrow()
    })
  })

  describe('connect', () => {
    it('connects output to a destination node', () => {
      const fakeCtx = new FakeAudioContext()
      const synth = createSynth(fakeCtx as unknown as BaseAudioContext)
      const dest = fakeCtx.createGain()
      // Should not throw
      expect(() => synth.connect(dest as unknown as AudioNode)).not.toThrow()
    })
  })
})
