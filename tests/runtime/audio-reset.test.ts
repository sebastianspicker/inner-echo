import { describe, expect, it } from 'vitest'
import {
  createCompressor,
  createDelay,
  createFlutter,
  createHighpass,
  createLowpass,
  createNoiseBed,
  createPulseTone,
  createReverb,
  createTremolo,
} from '../../src/runtime/audio/fx'
import { FakeAudioContext } from '../../tools/shared/fakeWebAudio'

function context(): { fake: FakeAudioContext; audio: BaseAudioContext } {
  const fake = new FakeAudioContext({ currentTime: 3, sampleRate: 8 })
  return { fake, audio: fake as unknown as BaseAudioContext }
}

describe('audio filter and modulation reset', () => {
  it('restores explicit and omitted filter constructor values', () => {
    const lowpassContext = context()
    const lowpass = createLowpass(lowpassContext.audio, { cutoff: 1_200, q: 1 })
    lowpass.setParams({ cutoff: 9_000, q: 0.5 })
    lowpass.resetParams?.()
    expect(lowpassContext.fake.filters[0].frequency.value).toBe(1_200)
    expect(lowpassContext.fake.filters[0].Q.value).toBe(1)

    const highpassContext = context()
    const highpass = createHighpass(highpassContext.audio)
    highpass.setParams({ cutoff: 400, q: 1.2 })
    highpass.resetParams?.()
    expect(highpassContext.fake.filters[0].frequency.value).toBe(160)
    expect(highpassContext.fake.filters[0].Q.value).toBe(0.7)
  })

  it('restores tremolo and flutter modulation parameters', () => {
    const tremoloContext = context()
    const tremolo = createTremolo(tremoloContext.audio, { rate: 2, depth: 0.1 })
    tremolo.setParams({ rate: 4, depth: 0 })
    tremolo.resetParams?.()
    expect(tremoloContext.fake.oscillators[0].frequency.value).toBe(2)
    expect(tremoloContext.fake.gains[2].gain.value).toBe(-0.05)
    expect(tremoloContext.fake.constants[0].offset.value).toBe(0.95)

    const flutterContext = context()
    const flutter = createFlutter(flutterContext.audio, { rate: 0.7, depth: 0.08 })
    flutter.setParams({ rate: 1.2, depth: 0 })
    flutter.resetParams?.()
    expect(flutterContext.fake.oscillators[0].frequency.value).toBe(0.7)
    expect(flutterContext.fake.gains[2].gain.value).toBeCloseTo(0.00048)
  })

  it('restores delay and pulse routing parameters without allocating nodes', () => {
    const delayContext = context()
    const delay = createDelay(delayContext.audio, { time: 0.2, feedback: 0.1, mix: 0.08 })
    const delayNodeCount = delayContext.fake.gains.length + delayContext.fake.delays.length
    delay.setParams({ time: 0.3, feedback: 0.15, mix: 0 })
    delay.resetParams?.()
    expect(delayContext.fake.delays[0].delayTime.value).toBe(0.2)
    expect(delayContext.fake.gains[4].gain.value).toBe(0.1)
    expect(delayContext.fake.gains[2].gain.value).toBe(0.08)
    expect(delayContext.fake.gains.length + delayContext.fake.delays.length).toBe(delayNodeCount)

    const pulseContext = context()
    const pulse = createPulseTone(pulseContext.audio, { rate: 1.5, mix: 0.08, base_freq: 140 })
    const pulseNodeCount = pulseContext.fake.gains.length + pulseContext.fake.oscillators.length
    pulse.setParams({ rate: 3, mix: 0, base_freq: 200 })
    pulse.resetParams?.()
    expect(pulseContext.fake.oscillators.map((node) => node.frequency.value)).toEqual([140, 1.5])
    expect(pulseContext.fake.gains[3].gain.value).toBe(0.04)
    expect(pulseContext.fake.gains.length + pulseContext.fake.oscillators.length).toBe(
      pulseNodeCount,
    )
  })
})

describe('audio texture and dynamics reset', () => {
  it('keeps level reset allocation-free and replaces a source to restore color', () => {
    const { fake, audio } = context()
    const noise = createNoiseBed(audio, { level: 0.04, color: 'brown' })
    noise.setParams({ level: 0.08 })
    noise.resetParams?.()
    expect(fake.gains[2].gain.value).toBe(0.04)
    expect(fake.bufferSources).toHaveLength(1)
    expect(fake.buffers).toHaveLength(1)

    noise.setParams({ color: 'white' })
    expect(fake.bufferSources).toHaveLength(2)
    expect(fake.buffers).toHaveLength(2)
    noise.resetParams?.()

    expect(fake.bufferSources).toHaveLength(3)
    expect(fake.buffers).toHaveLength(2)
    expect(fake.bufferSources.at(-1)?.buffer).toBe(fake.buffers[0])
  })

  it('restores reverb mix without regenerating an unchanged decay impulse', () => {
    const { fake, audio } = context()
    const reverb = createReverb(audio, { mix: 0.08, decay: 1.6 })
    expect(fake.buffers).toHaveLength(1)
    reverb.setParams({ mix: 0 })

    reverb.resetParams?.()

    expect(fake.gains[2].gain.value).toBe(0.08)
    expect(fake.buffers).toHaveLength(1)
  })

  it('restores compressor defaults and explicit constructor values', () => {
    const defaultContext = context()
    const compressor = createCompressor(defaultContext.audio)
    compressor.setParams({ threshold: -10, ratio: 12, attack: 0.05, release: 0.6, ceiling: -6 })
    compressor.resetParams?.()
    const node = defaultContext.fake.compressors[0]
    expect([node.threshold.value, node.ratio.value, node.attack.value, node.release.value]).toEqual(
      [-20, 3, 0.02, 0.25],
    )

    const explicitContext = context()
    const explicit = createCompressor(explicitContext.audio, { ceiling: -12 })
    explicit.setParams({ ceiling: -6 })
    explicit.resetParams?.()
    expect(explicitContext.fake.gains[1].gain.value).toBeCloseTo(10 ** (-12 / 20))
  })
})
