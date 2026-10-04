/**
 * Shared fake Web Audio implementation.
 *
 * Mirrors the subset of the Web Audio API that `src/runtime/audio/**`
 * touches: gain, biquad filter, delay, dynamics compressor, convolver,
 * oscillator, constant source, and buffer/buffer-source nodes, each tracked
 * per type on the owning `FakeAudioContext` so callers can assert on counts,
 * connections, and disposal.
 *
 * Used by build-time contract probes and inspection scenarios
 * (`tools/contracts/probes/audioNodeRegistry.ts`,
 * `tools/validation/inspect/audio-scenario.ts`).
 */

export class FakeAudioParam {
  value: number

  constructor(initial = 0) {
    this.value = initial
  }

  setValueAtTime(value: number, _time?: number): void {
    this.value = value
  }

  linearRampToValueAtTime(value: number, _time?: number): void {
    this.value = value
  }

  setTargetAtTime(value: number, _time?: number, _timeConstant?: number): void {
    this.value = value
  }

  cancelScheduledValues(_time?: number): void {}
}

export class FakeAudioNode {
  readonly connections: unknown[] = []
  disconnected = false

  connect(destination: unknown): unknown {
    this.connections.push(destination)
    return destination
  }

  disconnect(): void {
    this.disconnected = true
  }
}

export class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam(1)
}

export class FakeBiquadFilterNode extends FakeAudioNode {
  type: BiquadFilterType = 'lowpass'
  readonly frequency = new FakeAudioParam(350)
  readonly Q = new FakeAudioParam(1)
}

export class FakeDelayNode extends FakeAudioNode {
  readonly delayTime = new FakeAudioParam(0)
}

export class FakeDynamicsCompressorNode extends FakeAudioNode {
  readonly threshold = new FakeAudioParam(-24)
  readonly ratio = new FakeAudioParam(4)
  readonly attack = new FakeAudioParam(0.003)
  readonly release = new FakeAudioParam(0.1)
}

export class FakeConvolverNode extends FakeAudioNode {
  buffer: FakeAudioBuffer | null = null
}

class FakeScheduledSourceNode extends FakeAudioNode {
  started = false
  stopped = false

  start(_time = 0): void {
    this.started = true
  }

  stop(_time = 0): void {
    this.stopped = true
  }
}

export class FakeOscillatorNode extends FakeScheduledSourceNode {
  type: OscillatorType = 'sine'
  readonly frequency = new FakeAudioParam(440)
  readonly detune = new FakeAudioParam(0)
}

export class FakeConstantSourceNode extends FakeScheduledSourceNode {
  readonly offset = new FakeAudioParam(0)
}

export class FakeAudioBuffer {
  readonly numberOfChannels: number
  readonly length: number
  readonly sampleRate: number
  private readonly channels: Float32Array[]

  constructor(numberOfChannels: number, length: number, sampleRate = 48000) {
    this.numberOfChannels = numberOfChannels
    this.length = length
    this.sampleRate = sampleRate
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length))
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel] ?? new Float32Array(0)
  }
}

export class FakeAudioBufferSourceNode extends FakeScheduledSourceNode {
  buffer: FakeAudioBuffer | null = null
  loop = false
}

export interface FakeContextMark {
  gains: number
  biquads: number
  delays: number
  compressors: number
  convolvers: number
  oscillators: number
  constantSources: number
  buffers: number
  bufferSources: number
}

export interface FakeCreatedNodes {
  gains: FakeGainNode[]
  biquads: FakeBiquadFilterNode[]
  delays: FakeDelayNode[]
  compressors: FakeDynamicsCompressorNode[]
  convolvers: FakeConvolverNode[]
  oscillators: FakeOscillatorNode[]
  constantSources: FakeConstantSourceNode[]
  buffers: FakeAudioBuffer[]
  bufferSources: FakeAudioBufferSourceNode[]
}

export interface FakeAudioContextOptions {
  currentTime?: number
  sampleRate?: number
}

export class FakeAudioContext {
  readonly currentTime: number
  readonly sampleRate: number
  readonly destination = new FakeAudioNode()

  readonly gains: FakeGainNode[] = []
  readonly biquads: FakeBiquadFilterNode[] = []
  readonly delays: FakeDelayNode[] = []
  readonly compressors: FakeDynamicsCompressorNode[] = []
  readonly convolvers: FakeConvolverNode[] = []
  readonly oscillators: FakeOscillatorNode[] = []
  readonly constantSources: FakeConstantSourceNode[] = []
  readonly buffers: FakeAudioBuffer[] = []
  readonly bufferSources: FakeAudioBufferSourceNode[] = []

  constructor(options: FakeAudioContextOptions = {}) {
    this.currentTime = options.currentTime ?? 0
    this.sampleRate = options.sampleRate ?? 48000
  }

  createGain(): FakeGainNode {
    return this.record(this.gains, new FakeGainNode())
  }

  createBiquadFilter(): FakeBiquadFilterNode {
    return this.record(this.biquads, new FakeBiquadFilterNode())
  }

  createDelay(_maxDelayTime?: number): FakeDelayNode {
    return this.record(this.delays, new FakeDelayNode())
  }

  createDynamicsCompressor(): FakeDynamicsCompressorNode {
    return this.record(this.compressors, new FakeDynamicsCompressorNode())
  }

  createConvolver(): FakeConvolverNode {
    return this.record(this.convolvers, new FakeConvolverNode())
  }

  createOscillator(): FakeOscillatorNode {
    return this.record(this.oscillators, new FakeOscillatorNode())
  }

  createConstantSource(): FakeConstantSourceNode {
    return this.record(this.constantSources, new FakeConstantSourceNode())
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate?: number): FakeAudioBuffer {
    return this.record(
      this.buffers,
      new FakeAudioBuffer(numberOfChannels, length, sampleRate ?? this.sampleRate),
    )
  }

  createBufferSource(): FakeAudioBufferSourceNode {
    return this.record(this.bufferSources, new FakeAudioBufferSourceNode())
  }

  /** Alias for the node-count naming. */
  get filters(): FakeBiquadFilterNode[] {
    return this.biquads
  }

  /** Alias for the node-count naming. */
  get constants(): FakeConstantSourceNode[] {
    return this.constantSources
  }

  mark(): FakeContextMark {
    return {
      gains: this.gains.length,
      biquads: this.biquads.length,
      delays: this.delays.length,
      compressors: this.compressors.length,
      convolvers: this.convolvers.length,
      oscillators: this.oscillators.length,
      constantSources: this.constantSources.length,
      buffers: this.buffers.length,
      bufferSources: this.bufferSources.length,
    }
  }

  collectSince(mark: FakeContextMark): FakeCreatedNodes {
    return {
      gains: this.gains.slice(mark.gains),
      biquads: this.biquads.slice(mark.biquads),
      delays: this.delays.slice(mark.delays),
      compressors: this.compressors.slice(mark.compressors),
      convolvers: this.convolvers.slice(mark.convolvers),
      oscillators: this.oscillators.slice(mark.oscillators),
      constantSources: this.constantSources.slice(mark.constantSources),
      buffers: this.buffers.slice(mark.buffers),
      bufferSources: this.bufferSources.slice(mark.bufferSources),
    }
  }

  private record<T>(collection: T[], value: T): T {
    collection.push(value)
    return value
  }
}

export function hashBuffer(buffer: FakeAudioBuffer | null | undefined): number {
  if (!buffer) return 0
  const channel = buffer.getChannelData(0)
  if (channel.length === 0) return 0
  const stride = Math.max(1, Math.floor(channel.length / 256))
  let acc = 0
  for (let i = 0; i < channel.length; i += stride) {
    acc += channel[i] * (i + 1)
  }
  return acc
}
