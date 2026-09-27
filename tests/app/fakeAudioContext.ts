// A permissive fake AudioContext for characterization tests: every `createX()` node
// exposes generic connect/disconnect/start/stop plus AudioParam-like properties
// (value, setValueAtTime, linearRampToValueAtTime, setTargetAtTime, cancelScheduledValues),
// created lazily so any node/parameter the audio engine touches "just works".
import { vi } from 'vitest'
import { createDeferred, type Deferred } from './fakeBrowserMedia'

class FakeAudioParam {
  value: number
  constructor(initial = 0) {
    this.value = initial
  }
  setValueAtTime(value: number): FakeAudioParam {
    this.value = value
    return this
  }
  linearRampToValueAtTime(value: number): FakeAudioParam {
    this.value = value
    return this
  }
  setTargetAtTime(value: number): FakeAudioParam {
    this.value = value
    return this
  }
  cancelScheduledValues(): FakeAudioParam {
    return this
  }
}

const AUDIO_PARAM_DEFAULTS: Record<string, number> = {
  gain: 1,
  frequency: 350,
  detune: 0,
  Q: 1,
  delayTime: 0,
  threshold: -24,
  ratio: 4,
  attack: 0.003,
  release: 0.1,
  offset: 0,
  pan: 0,
}

interface FakeAudioNodeBase {
  numberOfInputs: number
  numberOfOutputs: number
  type: string
  loop: boolean
  buffer: unknown
  curve: Float32Array | null
  oversample: OverSampleType
  smoothingTimeConstant: number
  fftSize: number
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  getFloatTimeDomainData: ReturnType<typeof vi.fn>
  getFloatFrequencyData: ReturnType<typeof vi.fn>
}

function createNodeBase(): FakeAudioNodeBase {
  return {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    type: 'sine',
    loop: false,
    buffer: null,
    curve: null,
    oversample: 'none',
    smoothingTimeConstant: 0.8,
    fftSize: 2048,
    connect: vi.fn((destination?: unknown) => destination),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getFloatTimeDomainData: vi.fn((array: Float32Array) => array.fill(0)),
    getFloatFrequencyData: vi.fn((array: Float32Array) => array.fill(-100)),
  }
}

/** A generic node: known members come from the base object; unknown reads become AudioParams. */
function createFakeAudioNode(context: unknown): AudioNode {
  const base: Record<string, unknown> = { context, ...createNodeBase() }
  const params = new Map<string, FakeAudioParam>()
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop, receiver) {
      if (prop === 'frequencyBinCount') return (target.fftSize as number) / 2
      if (Reflect.has(target, prop)) return Reflect.get(target, prop, receiver)
      if (typeof prop !== 'string') return undefined
      const existing = params.get(prop)
      if (existing) return existing
      const created = new FakeAudioParam(AUDIO_PARAM_DEFAULTS[prop] ?? 0)
      params.set(prop, created)
      return created
    },
  }
  return new Proxy(base, handler) as unknown as AudioNode
}

function createFakeAudioBuffer(
  numberOfChannels: number,
  length: number,
  sampleRate: number,
): AudioBuffer {
  const channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length))
  return {
    numberOfChannels,
    length,
    sampleRate,
    getChannelData: (index: number) => channels[index] ?? new Float32Array(0),
  } as unknown as AudioBuffer
}

export interface FakeAudioContextController {
  instances: AudioContext[]
  constructedCount(): number
  deferNextResume(): Deferred<void>
}

function createContextState(pendingResumes: Deferred<void>[]) {
  let state: AudioContextState = 'suspended'
  const listeners = new Set<() => void>()
  const setState = (next: AudioContextState): void => {
    state = next
    for (const listener of listeners) listener()
  }
  const resume = vi.fn(async () => {
    const pending = pendingResumes.shift()
    if (pending) await pending.promise
    setState('running')
  })
  return { getState: () => state, setState, listeners, resume }
}

function buildContext(pendingResumes: Deferred<void>[]): AudioContext {
  const { getState, setState, listeners, resume } = createContextState(pendingResumes)
  const base: Record<string, unknown> = {
    currentTime: 0,
    sampleRate: 48000,
    get state() {
      return getState()
    },
    resume,
    suspend: vi.fn(async () => setState('suspended')),
    close: vi.fn(async () => setState('closed')),
    addEventListener: vi.fn((type: string, listener: () => void) => {
      if (type === 'statechange') listeners.add(listener)
    }),
    removeEventListener: vi.fn((type: string, listener: () => void) => {
      if (type === 'statechange') listeners.delete(listener)
    }),
    createBuffer: (channels: number, length: number, sampleRate: number) =>
      createFakeAudioBuffer(channels, length, sampleRate),
  }
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop, receiver) {
      if (Reflect.has(target, prop)) return Reflect.get(target, prop, receiver)
      if (typeof prop === 'string' && prop.startsWith('create'))
        return () => createFakeAudioNode(proxy)
      return undefined
    },
  }
  const proxy = new Proxy(base, handler) as unknown as AudioContext
  base.destination = createFakeAudioNode(proxy)
  return proxy
}

/** Reads the fake context's own close() spy for assertions without touching real AudioContext. */
export function getCloseMock(context: AudioContext): ReturnType<typeof vi.fn> {
  return (context as unknown as { close: ReturnType<typeof vi.fn> }).close
}

/** Installs window.AudioContext as a fake constructor and returns an inspection handle. */
export function installFakeAudioContext(): FakeAudioContextController {
  const instances: AudioContext[] = []
  const pendingResumes: Deferred<void>[] = []
  function FakeAudioContextCtor(this: unknown): AudioContext {
    const context = buildContext(pendingResumes)
    instances.push(context)
    return context
  }
  vi.stubGlobal('AudioContext', FakeAudioContextCtor as unknown as typeof AudioContext)
  return {
    instances,
    constructedCount: () => instances.length,
    deferNextResume: () => {
      const deferred = createDeferred<void>()
      pendingResumes.push(deferred)
      return deferred
    },
  }
}
