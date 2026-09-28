import { describe, expect, it, vi } from 'vitest'

vi.mock('../../src/runtime/audio/fx', () => ({
  createCompressor: () => ({
    connect: vi.fn(),
    dispose: vi.fn(),
    getInput: () => createNode(),
    setParams: vi.fn(),
  }),
}))

import { createMicLifecycleController } from '../../src/runtime/audio/micLifecycle'

function createNode() {
  return { connect: vi.fn(), disconnect: vi.fn() }
}

function createGain() {
  return {
    ...createNode(),
    gain: { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn() },
  }
}

function createContext() {
  const mixer = createGain()
  const context = {
    currentTime: 2,
    createAnalyser: () => ({ ...createNode(), fftSize: 0, smoothingTimeConstant: 0 }),
    createDynamicsCompressor: () => ({
      ...createNode(),
      threshold: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
    }),
    createGain,
    createMediaStreamSource: () => createNode(),
  }
  return { context: context as unknown as AudioContext, mixer: mixer as unknown as GainNode }
}

function createStream() {
  const track = { stop: vi.fn() }
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track }
}

function installUserMedia(getUserMedia: () => Promise<MediaStream>): void {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia } },
  })
}

describe('microphone lifecycle', () => {
  it('releases a stale permission result without activating a graph', async () => {
    let resolveRequest: (stream: MediaStream) => void = () => {}
    installUserMedia(
      () =>
        new Promise<MediaStream>((resolve) => {
          resolveRequest = resolve
        }),
    )
    const { context, mixer } = createContext()
    const statuses: string[] = []
    const controller = createMicLifecycleController({
      fftSize: 32,
      getContext: () => context,
      getMixer: () => mixer,
      isDisposed: () => false,
      onStatusChange: (status) => statuses.push(status),
      onStopped: vi.fn(),
      sampleMicRms: () => 0,
      safeDisconnect: vi.fn(),
    })

    const request = controller.requestMic(vi.fn())
    controller.stopMic()
    const { stream, track } = createStream()
    resolveRequest(stream)
    await request

    expect(track.stop).toHaveBeenCalledOnce()
    expect(statuses).toEqual(['requesting', 'off'])
    expect(controller.getDebugState().micEnabled).toBe(false)
  })

  it('cleans the active graph in order and does not retain microphone metrics', async () => {
    const { stream, track } = createStream()
    installUserMedia(async () => stream)
    const { context, mixer } = createContext()
    const events: string[] = []
    const safeDisconnect = vi.fn(() => events.push('disconnect'))
    const onStopped = vi.fn(() => events.push('stopped'))
    const controller = createMicLifecycleController({
      fftSize: 32,
      getContext: () => context,
      getMixer: () => mixer,
      isDisposed: () => false,
      onStatusChange: vi.fn(),
      onStopped,
      sampleMicRms: () => 0,
      safeDisconnect,
    })

    await controller.requestMic(vi.fn())
    expect(controller.getDebugState().micEnabled).toBe(true)
    controller.stopMic()

    expect(track.stop).toHaveBeenCalledBefore(safeDisconnect)
    expect(safeDisconnect).toHaveBeenCalledTimes(5)
    expect(onStopped).toHaveBeenCalledOnce()
    expect(controller.getMetricNodes()).toEqual({
      analyser: null,
      gateGain: null,
      routingGain: null,
    })
  })
})
