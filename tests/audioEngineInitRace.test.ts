import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeAudioContext } from '../src/contractVerification/fakeAudioContext'

class FakeAnalyser {
  fftSize = 2048
  smoothingTimeConstant = 0.5
  context: { sampleRate: number }
  frequencyBinCount = 1024

  constructor(sampleRate: number) {
    this.context = { sampleRate }
  }

  getFloatTimeDomainData(buffer: Float32Array): void {
    buffer.fill(0)
  }

  getFloatFrequencyData(buffer: Float32Array): void {
    buffer.fill(-120)
  }

  connect(_destination: unknown): void {}

  disconnect(): void {}
}

class HarnessAudioContext extends FakeAudioContext {
  createAnalyser(): AnalyserNode {
    return new FakeAnalyser(this.sampleRate) as unknown as AnalyserNode
  }

  createMediaStreamSource(_stream: MediaStream): MediaStreamAudioSourceNode {
    return this.createGain() as unknown as MediaStreamAudioSourceNode
  }
}

const contextState = vi.hoisted(() => ({
  ctx: null as HarnessAudioContext | null,
}))

const mocks = vi.hoisted(() => ({
  startAudioContextMock: vi.fn(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    return 'on' as const
  }),
  getAudioContextMock: vi.fn(() => contextState.ctx as unknown as AudioContext),
  closeAudioContextMock: vi.fn(async () => {}),
  addAudioContextListenerMock: vi.fn(() => () => {}),
}))

vi.mock('../src/engine/audio/contextManager', () => ({
  startAudioContext: mocks.startAudioContextMock,
  getAudioContext: mocks.getAudioContextMock,
  closeAudioContext: mocks.closeAudioContextMock,
  addAudioContextListener: mocks.addAudioContextListenerMock,
  suspendAudioContext: vi.fn(async () => {}),
}))

import { createAudioEngine } from '../src/engine/audio/audioEngine'

describe('engine/audio/audioEngine', () => {
  beforeEach(() => {
    contextState.ctx = new HarnessAudioContext()
    mocks.startAudioContextMock.mockClear()
    mocks.getAudioContextMock.mockClear()
    mocks.closeAudioContextMock.mockClear()
    mocks.addAudioContextListenerMock.mockClear()
  })

  it('applies condition audio updates queued before async init completes', async () => {
    const control = createAudioEngine({ enabled: false, master: { volume: 0 }, chain: [] }, {})

    control.setConditionAudio({
      enabled: true,
      master: { volume: 0.22 },
      chain: [{ node: 'lowpass', params: { cutoff: 900 } }],
    })

    await new Promise<void>((resolve) => setTimeout(resolve, 10))

    expect(control.getDebugState().activeNodes).toEqual(['lowpass'])

    control.stop()
  })
})
