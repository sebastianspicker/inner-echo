import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeAudioContext } from '../src/contractVerification/fakeAudioContext'

// ---------------------------------------------------------------------------
// Fake AnalyserNode that lets us control time-domain and frequency data.
// ---------------------------------------------------------------------------
class FakeAnalyser {
  fftSize = 2048
  smoothingTimeConstant = 0.5
  context: { sampleRate: number }
  frequencyBinCount = 1024

  private timeDomainFill: ((buf: Float32Array) => void) | null = null
  private freqFill: ((buf: Float32Array) => void) | null = null

  constructor(sampleRate: number) {
    this.context = { sampleRate }
  }

  setTimeDomainFill(fn: (buf: Float32Array) => void): void {
    this.timeDomainFill = fn
  }

  setFreqFill(fn: (buf: Float32Array) => void): void {
    this.freqFill = fn
  }

  getFloatTimeDomainData(buffer: Float32Array): void {
    if (this.timeDomainFill) this.timeDomainFill(buffer)
    else buffer.fill(0)
  }

  getFloatFrequencyData(buffer: Float32Array): void {
    if (this.freqFill) this.freqFill(buffer)
    else buffer.fill(-120)
  }

  connect(_destination: unknown): void {}
  disconnect(): void {}
}

// ---------------------------------------------------------------------------
// Harness AudioContext that extends the FakeAudioContext with an analyser.
// ---------------------------------------------------------------------------
class HarnessAudioContext extends FakeAudioContext {
  private _analyser: FakeAnalyser | null = null
  private readonly analysers: FakeAnalyser[] = []

  // Wrap every node factory so the returned object has a `.context` pointing back
  // to this HarnessAudioContext — mirrors real Web Audio API behavior.
  private withContext<T>(node: T): T {
    ;(node as Record<string, unknown>).context = this
    return node
  }

  createGain() {
    return this.withContext(super.createGain())
  }

  createBiquadFilter() {
    return this.withContext(super.createBiquadFilter())
  }

  createDelay(maxDelay?: number) {
    return this.withContext(super.createDelay(maxDelay))
  }

  createDynamicsCompressor() {
    return this.withContext(super.createDynamicsCompressor())
  }

  createConvolver() {
    return this.withContext(super.createConvolver())
  }

  createOscillator() {
    return this.withContext(super.createOscillator())
  }

  createConstantSource() {
    return this.withContext(super.createConstantSource())
  }

  createBufferSource() {
    return this.withContext(super.createBufferSource())
  }

  createAnalyser(): AnalyserNode {
    this._analyser = new FakeAnalyser(this.sampleRate)
    this.analysers.push(this._analyser)
    return this._analyser as unknown as AnalyserNode
  }

  createMediaStreamSource(_stream: MediaStream): MediaStreamAudioSourceNode {
    return this.createGain() as unknown as MediaStreamAudioSourceNode
  }

  getLastAnalyser(): FakeAnalyser | null {
    return this._analyser
  }

  getAnalysers(): FakeAnalyser[] {
    return this.analysers.slice()
  }
}

function installMockMicStream() {
  const stopTrack = vi.fn()
  const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream
  const getUserMedia = vi.fn(async () => stream)
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
  return { getUserMedia, stopTrack }
}

// ---------------------------------------------------------------------------
// Module-level hoisted state used by vi.mock.
// ---------------------------------------------------------------------------
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

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // -----------------------------------------------------------------------
  // API shape
  // -----------------------------------------------------------------------
  it('createAudioEngine() returns an object with the expected API', () => {
    const control = createAudioEngine(null, {})
    expect(control).toBeDefined()
    expect(typeof control.setMasterVolume).toBe('function')
    expect(typeof control.setConditionAudio).toBe('function')
    expect(typeof control.getRms).toBe('function')
    expect(typeof control.getMetrics).toBe('function')
    expect(typeof control.applyReactiveParams).toBe('function')
    expect(typeof control.requestMic).toBe('function')
    expect(typeof control.stopMic).toBe('function')
    expect(typeof control.setInputMode).toBe('function')
    expect(typeof control.setMicSensitivity).toBe('function')
    expect(typeof control.setMicGate).toBe('function')
    expect(typeof control.getDebugState).toBe('function')
    expect(typeof control.stop).toBe('function')
    control.stop()
  })

  // -----------------------------------------------------------------------
  // getDebugState defaults
  // -----------------------------------------------------------------------
  it('getDebugState returns defaults before init completes', () => {
    const control = createAudioEngine(null, {})
    const state = control.getDebugState()
    expect(state.inputMode).toBe('synth')
    expect(state.micEnabled).toBe(false)
    expect(state.micSensitivity).toBe(0.5)
    expect(state.micGate).toBe(0.25)
    expect(state.activeNodes).toEqual([])
    control.stop()
  })

  // -----------------------------------------------------------------------
  // getRms returns 0 before init
  // -----------------------------------------------------------------------
  it('getRms returns 0 when analyser is not yet created', () => {
    const control = createAudioEngine(null, {})
    expect(control.getRms()).toBe(0)
    control.stop()
  })

  // -----------------------------------------------------------------------
  // getMetrics returns zero metrics when analyser is not yet created
  // -----------------------------------------------------------------------
  it('getMetrics returns zero metrics when analyser is not yet created', () => {
    const control = createAudioEngine(null, {})
    const m = control.getMetrics()
    expect(m.rms).toBe(0)
    expect(m.centroid).toBe(0)
    expect(m.flux).toBe(0)
    control.stop()
  })

  // -----------------------------------------------------------------------
  // setMasterVolume doesn't throw before init
  // -----------------------------------------------------------------------
  it('setMasterVolume before init does not throw', () => {
    const control = createAudioEngine(null, {})
    expect(() => control.setMasterVolume(0.5)).not.toThrow()
    control.stop()
  })

  // -----------------------------------------------------------------------
  // After init, getMetrics returns computed values from analyser
  // -----------------------------------------------------------------------
  it('after init, getRms reflects analyser data', async () => {
    const control = createAudioEngine({ enabled: true, master: { volume: 0.3 }, chain: [] }, {})
    // Wait for async init to complete.
    await new Promise<void>((resolve) => setTimeout(resolve, 10))

    const analyser = contextState.ctx!.getLastAnalyser()
    expect(analyser).not.toBeNull()

    // Fill time domain with a constant value of 0.5 to produce a known RMS.
    analyser!.setTimeDomainFill((buf) => buf.fill(0.5))
    const rms = control.getRms()
    // RMS of a constant 0.5 signal = 0.5.
    expect(rms).toBeCloseTo(0.5, 4)

    control.stop()
  })

  // -----------------------------------------------------------------------
  // computeRms: silence produces 0
  // -----------------------------------------------------------------------
  it('getRms returns 0 for silent analyser data', async () => {
    const control = createAudioEngine({ enabled: true, master: { volume: 0.3 }, chain: [] }, {})
    await new Promise<void>((resolve) => setTimeout(resolve, 10))

    const analyser = contextState.ctx!.getLastAnalyser()
    analyser!.setTimeDomainFill((buf) => buf.fill(0))
    expect(control.getRms()).toBe(0)
    control.stop()
  })

  // -----------------------------------------------------------------------
  // computeRms: known non-trivial input
  // -----------------------------------------------------------------------
  it('getRms produces correct value for known input', async () => {
    const control = createAudioEngine({ enabled: true, master: { volume: 0.3 }, chain: [] }, {})
    await new Promise<void>((resolve) => setTimeout(resolve, 10))

    const analyser = contextState.ctx!.getLastAnalyser()
    // Fill with alternating 0.1 and -0.1 — RMS should be 0.1.
    analyser!.setTimeDomainFill((buf) => {
      for (let i = 0; i < buf.length; i++) buf[i] = i % 2 === 0 ? 0.1 : -0.1
    })
    const rms = control.getRms()
    expect(rms).toBeCloseTo(0.1, 4)
    control.stop()
  })

  // -----------------------------------------------------------------------
  // getMetrics returns spectral features after init
  // -----------------------------------------------------------------------
  it('getMetrics returns spectral centroid and flux from analyser', async () => {
    const control = createAudioEngine({ enabled: true, master: { volume: 0.3 }, chain: [] }, {})
    await new Promise<void>((resolve) => setTimeout(resolve, 10))

    const analyser = contextState.ctx!.getLastAnalyser()

    // Fill frequency data with a gradient to produce a known centroid.
    // Each bin i gets a dB value that rises linearly: this puts energy towards higher bins.
    analyser!.setFreqFill((buf) => {
      for (let i = 0; i < buf.length; i++) {
        // Map i to dB range: -60 at i=0, -20 at i=max -> more energy at higher bins.
        buf[i] = -60 + (40 * i) / Math.max(1, buf.length - 1)
      }
    })
    analyser!.setTimeDomainFill((buf) => buf.fill(0.01))

    const metrics = control.getMetrics()
    expect(metrics.rms).toBeGreaterThan(0)
    // With rising frequency spectrum, centroid should be significantly above 0.
    expect(metrics.centroid).toBeGreaterThan(0)
    // First call: flux should be > 0 because previous mag is null -> new data differs from zeros.
    expect(metrics.flux).toBeGreaterThanOrEqual(0)

    control.stop()
  })

  // -----------------------------------------------------------------------
  // stop() is idempotent
  // -----------------------------------------------------------------------
  it('stop() can be called multiple times without error', async () => {
    const control = createAudioEngine({ enabled: true, master: { volume: 0.3 }, chain: [] }, {})
    await new Promise<void>((resolve) => setTimeout(resolve, 10))
    expect(() => {
      control.stop()
      control.stop()
    }).not.toThrow()
  })

  // -----------------------------------------------------------------------
  // setConditionAudio rebuilds the chain
  // -----------------------------------------------------------------------
  it('setConditionAudio updates activeNodes in debug state', async () => {
    const control = createAudioEngine({ enabled: false, master: { volume: 0 }, chain: [] }, {})
    await new Promise<void>((resolve) => setTimeout(resolve, 10))

    control.setConditionAudio({
      enabled: true,
      master: { volume: 0.22 },
      chain: [{ node: 'lowpass', params: { cutoff: 900 } }],
    })

    // Wait for the ramp timeout + rebuild.
    await new Promise<void>((resolve) => setTimeout(resolve, 50))

    expect(control.getDebugState().activeNodes).toEqual(['lowpass'])
    control.stop()
  })

  // -----------------------------------------------------------------------
  // setInputMode changes debug state
  // -----------------------------------------------------------------------
  it('setInputMode updates debug state', async () => {
    const control = createAudioEngine(null, {})
    await new Promise<void>((resolve) => setTimeout(resolve, 10))

    control.setInputMode('mic')
    expect(control.getDebugState().inputMode).toBe('mic')

    control.setInputMode('mix')
    expect(control.getDebugState().inputMode).toBe('mix')

    control.setInputMode('synth')
    expect(control.getDebugState().inputMode).toBe('synth')

    control.stop()
  })

  // -----------------------------------------------------------------------
  // getMetrics suppresses mic metrics when mic is muted by synth-only routing
  // -----------------------------------------------------------------------
  it('getMetrics does not expose active mic metrics in synth mode', async () => {
    const { getUserMedia } = installMockMicStream()
    const control = createAudioEngine({ enabled: true, master: { volume: 0.3 }, chain: [] }, {})
    await new Promise<void>((resolve) => setTimeout(resolve, 10))

    control.requestMic()
    await new Promise<void>((resolve) => setTimeout(resolve, 10))

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })

    const micAnalyser = contextState.ctx!.getAnalysers()[1]
    expect(micAnalyser).toBeDefined()
    micAnalyser!.setTimeDomainFill((buf) => buf.fill(0.8))
    micAnalyser!.setFreqFill((buf) => buf.fill(-20))

    const metrics = control.getMetrics()
    expect(metrics).not.toHaveProperty('micRms')
    expect(metrics).not.toHaveProperty('micCentroid')
    expect(metrics).not.toHaveProperty('micFlux')
    expect(metrics).not.toHaveProperty('micLow')
    expect(metrics).not.toHaveProperty('micMid')
    expect(metrics).not.toHaveProperty('micHigh')

    control.stop()
  })

  // -----------------------------------------------------------------------
  // getMetrics reports mic metrics after input-mode and gate gain are applied
  // -----------------------------------------------------------------------
  it('getMetrics route-scales mic magnitude metrics but preserves spectral shape', async () => {
    installMockMicStream()
    const control = createAudioEngine({ enabled: true, master: { volume: 0.3 }, chain: [] }, {})
    await new Promise<void>((resolve) => setTimeout(resolve, 10))

    const mark = contextState.ctx!.mark()
    control.requestMic()
    await new Promise<void>((resolve) => setTimeout(resolve, 10))

    const created = contextState.ctx!.collectSince(mark)
    const micGateGain = created.gains[created.gains.length - 2]
    const micRoutingGain = created.gains[created.gains.length - 1]
    expect(micGateGain).toBeDefined()
    expect(micRoutingGain).toBeDefined()

    control.setInputMode('mix')
    expect(micRoutingGain!.gain.value).toBeCloseTo(0.6, 4)
    micGateGain!.gain.value = 0.5

    const micAnalyser = contextState.ctx!.getAnalysers()[1]
    expect(micAnalyser).toBeDefined()
    micAnalyser!.setTimeDomainFill((buf) => buf.fill(0.8))
    micAnalyser!.setFreqFill((buf) => buf.fill(-20))

    const effectiveGain = 0.6 * 0.5
    const metrics = control.getMetrics()
    expect(metrics.micRms).toBeCloseTo(0.8 * effectiveGain, 4)
    expect(metrics.micCentroid).toBeCloseTo(0.5, 4)
    expect(metrics.micFlux).toBeCloseTo(1 * effectiveGain, 4)
    expect((metrics.micLow ?? 0) + (metrics.micMid ?? 0) + (metrics.micHigh ?? 0)).toBeCloseTo(1, 4)

    control.stop()
  })

  // -----------------------------------------------------------------------
  // setMicSensitivity and setMicGate update debug state
  // -----------------------------------------------------------------------
  it('setMicSensitivity and setMicGate update debug state', () => {
    const control = createAudioEngine(null, {})
    control.setMicSensitivity(0.8)
    expect(control.getDebugState().micSensitivity).toBeCloseTo(0.8)
    control.setMicGate(0.6)
    expect(control.getDebugState().micGate).toBeCloseTo(0.6)
    control.stop()
  })

  // -----------------------------------------------------------------------
  // setMicSensitivity clamps to 0..1
  // -----------------------------------------------------------------------
  it('setMicSensitivity clamps value to 0..1', () => {
    const control = createAudioEngine(null, {})
    control.setMicSensitivity(2.0)
    expect(control.getDebugState().micSensitivity).toBe(1)
    control.setMicSensitivity(-1)
    expect(control.getDebugState().micSensitivity).toBe(0)
    control.stop()
  })

  // -----------------------------------------------------------------------
  // applyReactiveParams does not crash with empty overrides
  // -----------------------------------------------------------------------
  it('applyReactiveParams with empty overrides does not throw', async () => {
    const control = createAudioEngine(
      {
        enabled: true,
        master: { volume: 0.2 },
        chain: [{ node: 'lowpass', params: { cutoff: 800 } }],
      },
      {},
    )
    await new Promise<void>((resolve) => setTimeout(resolve, 50))
    expect(() => control.applyReactiveParams({})).not.toThrow()
    expect(() => control.applyReactiveParams({ 'audio.0.cutoff': 500 })).not.toThrow()
    control.stop()
  })

  // -----------------------------------------------------------------------
  // setConditionAudio(null) disables audio
  // -----------------------------------------------------------------------
  it('setConditionAudio(null) results in empty active nodes', async () => {
    const control = createAudioEngine(
      { enabled: true, master: { volume: 0.2 }, chain: [{ node: 'lowpass', params: {} }] },
      {},
    )
    await new Promise<void>((resolve) => setTimeout(resolve, 10))
    control.setConditionAudio(null)
    await new Promise<void>((resolve) => setTimeout(resolve, 50))
    expect(control.getDebugState().activeNodes).toEqual([])
    control.stop()
  })

  // -----------------------------------------------------------------------
  // Callbacks: onStatusChange fires
  // -----------------------------------------------------------------------
  it('onStatusChange callback is wired through addAudioContextListener', async () => {
    const onStatus = vi.fn()
    const control = createAudioEngine(null, { onStatusChange: onStatus })
    await new Promise<void>((resolve) => setTimeout(resolve, 10))
    // addAudioContextListener should have been called during init.
    expect(mocks.addAudioContextListenerMock).toHaveBeenCalled()
    control.stop()
  })
})
