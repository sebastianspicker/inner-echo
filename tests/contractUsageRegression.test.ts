import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { TemporalSmearNode } from '../src/engine/effects/temporalSmearNode'
import { createNoiseBed } from '../src/engine/audio/fx/noiseBed'

type SeededFn<T> = () => T

function withSeededRandom<T>(seed: number, fn: SeededFn<T>): T {
  const prev = Math.random
  let state = seed >>> 0
  Math.random = () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0xffffffff
  }
  try {
    return fn()
  } finally {
    Math.random = prev
  }
}

function arrayDistance(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length)
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += Math.abs(a[i] - b[i])
  }
  return sum
}

class FakeAudioParam {
  value = 0

  setValueAtTime(v: number): void {
    this.value = v
  }
}

class FakeGainNode {
  gain = new FakeAudioParam()

  connect(_destination: unknown): void {}

  disconnect(): void {}
}

class FakeAudioBuffer {
  readonly channels: Float32Array[]

  constructor(numberOfChannels: number, length: number) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length))
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel]
  }
}

class FakeBufferSourceNode {
  buffer: FakeAudioBuffer | null = null
  loop = false

  connect(_destination: unknown): void {}

  disconnect(): void {}

  start(_time = 0): void {}

  stop(): void {}
}

class FakeAudioContext {
  sampleRate = 48000
  currentTime = 0
  readonly bufferSources: FakeBufferSourceNode[] = []

  createGain(): FakeGainNode {
    return new FakeGainNode()
  }

  createBuffer(numberOfChannels: number, length: number, _sampleRate: number): FakeAudioBuffer {
    return new FakeAudioBuffer(numberOfChannels, length)
  }

  createBufferSource(): FakeBufferSourceNode {
    const node = new FakeBufferSourceNode()
    this.bufferSources.push(node)
    return node
  }
}

describe('runtime param usage regression checks', () => {
  it('temporal_smear.decay changes runtime state', () => {
    const node = new TemporalSmearNode() as unknown as {
      material?: { uniforms: Record<string, { value: number }> }
      getMaterial(input: THREE.Texture, prev?: THREE.Texture | null): THREE.Material
      setParams(params: {
        intensity: number
        safeMode: boolean
        controlValues: Record<string, number>
        nodeIndex: number
      }): void
    }
    node.getMaterial(new THREE.Texture(), new THREE.Texture())

    node.setParams({
      intensity: 1,
      safeMode: false,
      controlValues: { '0.feedback': 0.2, '0.jitter': 0.03, '0.decay': 0.85 },
      nodeIndex: 0,
    })
    const a = node.material?.uniforms.u_decay.value ?? 0

    node.setParams({
      intensity: 1,
      safeMode: false,
      controlValues: { '0.feedback': 0.2, '0.jitter': 0.03, '0.decay': 0.99 },
      nodeIndex: 0,
    })
    const b = node.material?.uniforms.u_decay.value ?? 0

    expect(a).not.toBe(b)
  })

  it('noise_bed.color changes generated audio texture', () => {
    const whiteBuffer = withSeededRandom(7, () => {
      const ctx = new FakeAudioContext()
      const module = createNoiseBed(ctx as unknown as BaseAudioContext, {
        level: 0.02,
        color: 'white',
      })
      const buffer = ctx.bufferSources[0]?.buffer
      module.dispose()
      if (!buffer) throw new Error('Missing white noise buffer')
      return buffer.getChannelData(0).slice()
    })

    const brownBuffer = withSeededRandom(7, () => {
      const ctx = new FakeAudioContext()
      const module = createNoiseBed(ctx as unknown as BaseAudioContext, {
        level: 0.02,
        color: 'brown',
      })
      const buffer = ctx.bufferSources[0]?.buffer
      module.dispose()
      if (!buffer) throw new Error('Missing brown noise buffer')
      return buffer.getChannelData(0).slice()
    })

    expect(arrayDistance(whiteBuffer, brownBuffer)).toBeGreaterThan(0)
  })
})
