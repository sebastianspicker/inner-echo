import { describe, expect, it, vi } from 'vitest'

import { createAudioMetricSampler } from '../../src/runtime/audio/audioMetricSampler'

function createAnalyser(initialDb = -60) {
  let db = initialDb
  const analyser = {
    fftSize: 4,
    frequencyBinCount: 2,
    context: { sampleRate: 48_000 },
    getFloatTimeDomainData: vi.fn((target: Float32Array) => target.fill(0.5)),
    getFloatFrequencyData: vi.fn((target: Float32Array) => target.fill(db)),
  }
  return {
    analyser: analyser as unknown as AnalyserNode,
    getFloatFrequencyData: analyser.getFloatFrequencyData,
    getFloatTimeDomainData: analyser.getFloatTimeDomainData,
    setDb(value: number) {
      db = value
    },
  }
}

function createMicNodes(analyser: AnalyserNode, gate = 1, routing = 1) {
  return {
    analyser,
    gateGain: { gain: { value: gate } } as GainNode,
    routingGain: { gain: { value: routing } } as GainNode,
  }
}

describe('audio metric sampler', () => {
  it('starts a fresh spectral interval after sampling is paused', () => {
    const sampler = createAudioMetricSampler(4)
    const main = createAnalyser(-60)
    const mic = createAnalyser(-60)
    const nodes = createMicNodes(mic.analyser)
    expect(sampler.getMetrics(main.analyser, nodes, 'mix').flux).toBe(0)
    main.setDb(-30)
    mic.setDb(-30)
    expect(sampler.getMetrics(main.analyser, nodes, 'mix').flux).toBeGreaterThan(0)
    sampler.resetMetricHistory()
    main.setDb(-10)
    mic.setDb(-10)
    const resumed = sampler.getMetrics(main.analyser, nodes, 'mix')
    expect(resumed.flux).toBe(0)
    expect(resumed.micFlux).toBe(0)
    main.setDb(0)
    expect(sampler.getMetrics(main.analyser, nodes, 'mix').flux).toBeGreaterThan(0)
  })
  it('skips muted mic metrics, invalidates flux history, and leaves gate sampling independent', () => {
    const sampler = createAudioMetricSampler(4)
    const main = createAnalyser()
    const mic = createAnalyser(-60)
    const micNodes = createMicNodes(mic.analyser)

    expect(sampler.getMetrics(main.analyser, micNodes, 'mix').micFlux).toBe(0)
    mic.setDb(-20)
    expect(sampler.getMetrics(main.analyser, micNodes, 'mix').micFlux).toBeGreaterThan(0)

    micNodes.gateGain.gain.value = 0
    const timeReadsBeforeMute = mic.getFloatTimeDomainData.mock.calls.length
    const frequencyReadsBeforeMute = mic.getFloatFrequencyData.mock.calls.length
    const muted = sampler.getMetrics(main.analyser, micNodes, 'mix')
    expect(muted.micRms).toBeUndefined()
    expect(mic.getFloatTimeDomainData).toHaveBeenCalledTimes(timeReadsBeforeMute)
    expect(mic.getFloatFrequencyData).toHaveBeenCalledTimes(frequencyReadsBeforeMute)

    sampler.sampleMicRms(mic.analyser)
    expect(mic.getFloatTimeDomainData).toHaveBeenCalledTimes(timeReadsBeforeMute + 1)
    expect(mic.getFloatFrequencyData).toHaveBeenCalledTimes(frequencyReadsBeforeMute)

    micNodes.gateGain.gain.value = 1
    mic.setDb(-10)
    expect(sampler.getMetrics(main.analyser, micNodes, 'mix').micFlux).toBe(0)
    mic.setDb(0)
    expect(sampler.getMetrics(main.analyser, micNodes, 'mix').micFlux).toBeGreaterThan(0)
  })

  it('treats synth routing as zero contribution without reading the mic analyser', () => {
    const sampler = createAudioMetricSampler(4)
    const main = createAnalyser()
    const mic = createAnalyser()

    const metrics = sampler.getMetrics(main.analyser, createMicNodes(mic.analyser), 'synth')

    expect(metrics.micRms).toBeUndefined()
    expect(mic.getFloatTimeDomainData).not.toHaveBeenCalled()
    expect(mic.getFloatFrequencyData).not.toHaveBeenCalled()
  })
})
