import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { TemporalSmearNode } from '../../src/engine/effects/temporalSmearNode'
import { createNoiseBed } from '../../src/engine/audio/fx/noiseBed'
import { FakeAudioContext } from '../../src/contractVerification/fakeAudioContext'
import { withSeededRandom } from '../../src/contractVerification/utils'

function arrayDistance(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length)
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += Math.abs(a[i] - b[i])
  }
  return sum
}

function generateNoiseTexture(color: 'white' | 'brown'): Float32Array {
  return withSeededRandom(7, () => {
    const context = new FakeAudioContext()
    const mark = context.mark()
    const module = createNoiseBed(context as unknown as BaseAudioContext, { level: 0.02, color })
    const buffer = context.collectSince(mark).bufferSources[0]?.buffer
    module.dispose()
    if (!buffer) throw new Error(`Missing ${color} noise buffer`)
    return buffer.getChannelData(0).slice()
  })
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
    const whiteBuffer = generateNoiseTexture('white')
    const brownBuffer = generateNoiseTexture('brown')

    expect(arrayDistance(whiteBuffer, brownBuffer)).toBeGreaterThan(0)
  })
})
