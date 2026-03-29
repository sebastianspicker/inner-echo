interface Connectable {
  connect(destination: unknown): void
  disconnect(): void
}

class FakeAudioParam {
  value: number

  constructor(initial = 0) {
    this.value = initial
  }

  setValueAtTime(v: number, _t: number): void {
    this.value = v
  }

  linearRampToValueAtTime(v: number, _t: number): void {
    this.value = v
  }

  cancelScheduledValues(_t: number): void {}
}

class FakeAudioNode implements Connectable {
  connect(_destination: unknown): void {}

  disconnect(): void {}
}

export class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam(1)
}

export class FakeBiquadFilterNode extends FakeAudioNode {
  type: BiquadFilterType = 'lowpass'
  frequency = new FakeAudioParam(350)
  Q = new FakeAudioParam(1)
}

export class FakeDelayNode extends FakeAudioNode {
  delayTime = new FakeAudioParam(0)
}

export class FakeDynamicsCompressorNode extends FakeAudioNode {
  threshold = new FakeAudioParam(-24)
  ratio = new FakeAudioParam(4)
  attack = new FakeAudioParam(0.003)
  release = new FakeAudioParam(0.1)
}

export class FakeConvolverNode extends FakeAudioNode {
  buffer: FakeAudioBuffer | null = null
}

export class FakeOscillatorNode extends FakeAudioNode {
  type: OscillatorType = 'sine'
  frequency = new FakeAudioParam(440)
  detune = new FakeAudioParam(0)
  started = false
  stopped = false

  start(_t = 0): void {
    this.started = true
  }

  stop(_t = 0): void {
    this.stopped = true
  }
}

export class FakeConstantSourceNode extends FakeAudioNode {
  offset = new FakeAudioParam(0)
  started = false
  stopped = false

  start(_t = 0): void {
    this.started = true
  }

  stop(_t = 0): void {
    this.stopped = true
  }
}

export class FakeAudioBuffer {
  readonly numberOfChannels: number
  readonly length: number
  readonly sampleRate: number
  private readonly channels: Float32Array[]

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels
    this.length = length
    this.sampleRate = sampleRate
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length))
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel] ?? new Float32Array(0)
  }
}

export class FakeAudioBufferSourceNode extends FakeAudioNode {
  buffer: FakeAudioBuffer | null = null
  loop = false
  started = false
  stopped = false

  start(_t = 0): void {
    this.started = true
  }

  stop(_t = 0): void {
    this.stopped = true
  }
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

export class FakeAudioContext {
  readonly currentTime = 0
  readonly sampleRate = 48000
  readonly destination = new FakeAudioNode()

  private readonly gains: FakeGainNode[] = []
  private readonly biquads: FakeBiquadFilterNode[] = []
  private readonly delays: FakeDelayNode[] = []
  private readonly compressors: FakeDynamicsCompressorNode[] = []
  private readonly convolvers: FakeConvolverNode[] = []
  private readonly oscillators: FakeOscillatorNode[] = []
  private readonly constantSources: FakeConstantSourceNode[] = []
  private readonly buffers: FakeAudioBuffer[] = []
  private readonly bufferSources: FakeAudioBufferSourceNode[] = []

  createGain(): FakeGainNode {
    const n = new FakeGainNode()
    this.gains.push(n)
    return n
  }

  createBiquadFilter(): FakeBiquadFilterNode {
    const n = new FakeBiquadFilterNode()
    this.biquads.push(n)
    return n
  }

  createDelay(_maxDelayTime?: number): FakeDelayNode {
    const n = new FakeDelayNode()
    this.delays.push(n)
    return n
  }

  createDynamicsCompressor(): FakeDynamicsCompressorNode {
    const n = new FakeDynamicsCompressorNode()
    this.compressors.push(n)
    return n
  }

  createConvolver(): FakeConvolverNode {
    const n = new FakeConvolverNode()
    this.convolvers.push(n)
    return n
  }

  createOscillator(): FakeOscillatorNode {
    const n = new FakeOscillatorNode()
    this.oscillators.push(n)
    return n
  }

  createConstantSource(): FakeConstantSourceNode {
    const n = new FakeConstantSourceNode()
    this.constantSources.push(n)
    return n
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): FakeAudioBuffer {
    const b = new FakeAudioBuffer(numberOfChannels, length, sampleRate)
    this.buffers.push(b)
    return b
  }

  createBufferSource(): FakeAudioBufferSourceNode {
    const n = new FakeAudioBufferSourceNode()
    this.bufferSources.push(n)
    return n
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
