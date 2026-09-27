import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAudioGraphSession } from '../../src/runtime/audio/audioGraphSession'
import { createOutputGuard } from '../../src/runtime/audio/outputGuard'
import { GLOBAL_SAFETY_CLAMPS } from '../../src/domain/experience/safetyLimits'

const graph = vi.hoisted(() => ({
  module: { setParams: vi.fn(), resetParams: vi.fn(), dispose: vi.fn() },
  configure: vi.fn(),
  synth: { connect: vi.fn(), dispose: vi.fn() },
}))
vi.mock('../../src/runtime/audio/outputRouting', () => ({
  configureOutputRouting: graph.configure,
}))
vi.mock('../../src/runtime/audio/synth', () => ({ createSynth: () => graph.synth }))

function fixture() {
  vi.useFakeTimers()
  graph.configure.mockReset().mockImplementation((_context, _stack, _enabled, master, mixer) => {
    mixer.connect(master)
    return { analyser: node(), chain: [graph.module] }
  })
  graph.module.setParams.mockClear()
  graph.module.resetParams.mockClear()
  const guards: ReturnType<typeof node>[] = []
  const gains: ReturnType<typeof node>[] = []
  function node() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      context: { currentTime: 0 },
      gain: {
        value: 1,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      curve: null as Float32Array | null,
      oversample: 'none',
    }
  }
  const destination = node()
  const context = {
    destination,
    currentTime: 0,
    createGain: () => {
      const gain = node()
      gains.push(gain)
      return gain
    },
    createWaveShaper: () => {
      const guard = node()
      guards.push(guard)
      return guard
    },
  }
  const stack = {
    enabled: true,
    master: { volume: 0.1 },
    chain: [{ node: 'lowpass', params: { cutoff: 800 } }],
  }
  const session = createAudioGraphSession(stack, {
    fftSize: 2048,
    rampMs: 25,
    getContext: () => context as unknown as AudioContext,
    isDisposed: () => false,
    applyInputMode: () => {},
    safeDisconnect: (node) => node?.disconnect(),
  })
  return { session, stack, guards, gains, destination }
}
afterEach(() => vi.useRealTimers())

describe('audio graph ownership', () => {
  it('retains equivalent graphs and does not postpone a pending equivalent switch', () => {
    const { session, stack } = fixture()
    session.initialize()
    session.setConditionAudio({ chain: stack.chain, master: stack.master, enabled: true })
    vi.advanceTimersByTime(30)
    expect(graph.configure).toHaveBeenCalledTimes(1)
    const changed = { ...stack, master: { volume: 0.2 } }
    session.setConditionAudio(changed)
    vi.advanceTimersByTime(20)
    session.setConditionAudio(structuredClone(changed))
    vi.advanceTimersByTime(5)
    expect(graph.configure).toHaveBeenCalledTimes(2)
    session.dispose()
  })

  it('guards the sole destination connection across switches and disconnects it on stop', () => {
    const { session, stack, guards, gains, destination } = fixture()
    session.initialize()
    session.setMasterVolume(1)
    session.setConditionAudio({ enabled: true, chain: [] })
    vi.advanceTimersByTime(25)
    session.setConditionAudio(stack)
    vi.advanceTimersByTime(25)
    expect(guards).toHaveLength(1)
    expect(gains[0].connect).toHaveBeenCalledExactlyOnceWith(guards[0])
    expect(guards[0].connect).toHaveBeenCalledExactlyOnceWith(destination)
    expect(
      gains.every((gain) => !gain.connect.mock.calls.some(([target]) => target === destination)),
    ).toBe(true)
    session.dispose()
    expect(guards[0].disconnect).toHaveBeenCalledOnce()
    expect(gains[0].disconnect).toHaveBeenCalledOnce()
  })

  it('restores withdrawn modulation while retaining other current overrides', () => {
    const { session } = fixture()
    session.initialize()
    session.applyReactiveParams({ 'audio.0.cutoff': 1400, 'audio.0.q': 1 })
    session.applyReactiveParams({ 'audio.0.cutoff': 1500, 'audio.0.q': 1 })
    expect(graph.module.resetParams).not.toHaveBeenCalled()
    session.applyReactiveParams({ 'audio.0.q': 0.9 })
    expect(graph.module.resetParams).toHaveBeenCalledOnce()
    expect(graph.module.setParams).toHaveBeenLastCalledWith({ q: 0.9 })
    session.applyReactiveParams({})
    session.applyReactiveParams({})
    expect(graph.module.resetParams).toHaveBeenCalledTimes(2)
    session.dispose()
  })

  it('cancels pending work on disposal', () => {
    const { session } = fixture()
    session.initialize()
    session.setConditionAudio({ enabled: false })
    session.dispose()
    vi.runAllTimers()
    expect(graph.configure).toHaveBeenCalledTimes(1)
  })
})

describe('final digital output guard', () => {
  it('is finite, symmetric, monotone, bounded, and linear for quiet samples', () => {
    const guard = { curve: null as Float32Array | null, oversample: '' }
    createOutputGuard({ createWaveShaper: () => guard } as unknown as BaseAudioContext)
    const curve = guard.curve as Float32Array
    const limit = 10 ** (GLOBAL_SAFETY_CLAMPS.audio_ceiling_dbfs / 20)
    expect(guard.oversample).toBe('none')
    expect(curve[(curve.length - 1) / 2]).toBe(0)
    for (let index = 0; index < curve.length; index += 1) {
      expect(Number.isFinite(curve[index])).toBe(true)
      expect(Math.abs(curve[index])).toBeLessThanOrEqual(limit)
      expect(curve[index]).toBeCloseTo(-curve[curve.length - 1 - index], 7)
      if (index) expect(curve[index]).toBeGreaterThanOrEqual(curve[index - 1])
      const input = (index * 2) / (curve.length - 1) - 1
      if (Math.abs(input) < 0.3) expect(curve[index]).toBeCloseTo(input, 7)
    }
  })
})
