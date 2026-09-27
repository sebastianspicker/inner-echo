import { type ShaderMaterial, Texture, type Vector2 } from 'three'
import { describe, expect, it, vi } from 'vitest'
import { createFlutter } from '../../src/runtime/audio/fx/flutter'
import { createTremolo } from '../../src/runtime/audio/fx/tremolo'
import { FocusJitterNode } from '../../src/runtime/visual/effects/focusJitterNode'
import { SalienceCompetitionNode } from '../../src/runtime/visual/effects/salienceCompetitionNode'

class FakeAudioParam {
  value = 0

  setValueAtTime(value: number): void {
    this.value = value
  }
}

class FakeAudioNode {
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

class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam()
}

class FakeOscillatorNode extends FakeAudioNode {
  readonly frequency = new FakeAudioParam()
  type = 'sine'
  started = false
  stopped = false

  start(): void {
    this.started = true
  }

  stop(): void {
    this.stopped = true
  }
}

class FakeConstantSourceNode extends FakeAudioNode {
  readonly offset = new FakeAudioParam()
  started = false
  stopped = false

  start(): void {
    this.started = true
  }

  stop(): void {
    this.stopped = true
  }
}

class FakeDelayNode extends FakeAudioNode {
  readonly delayTime = new FakeAudioParam()
}

class FakeAudioContext {
  currentTime = 2
  readonly gains: FakeGainNode[] = []
  readonly oscillators: FakeOscillatorNode[] = []
  readonly constantSources: FakeConstantSourceNode[] = []
  readonly delays: FakeDelayNode[] = []

  createGain(): FakeGainNode {
    const node = new FakeGainNode()
    this.gains.push(node)
    return node
  }

  createOscillator(): FakeOscillatorNode {
    const node = new FakeOscillatorNode()
    this.oscillators.push(node)
    return node
  }

  createConstantSource(): FakeConstantSourceNode {
    const node = new FakeConstantSourceNode()
    this.constantSources.push(node)
    return node
  }

  createDelay(): FakeDelayNode {
    const node = new FakeDelayNode()
    this.delays.push(node)
    return node
  }
}

function materialFor(node: FocusJitterNode | SalienceCompetitionNode): ShaderMaterial {
  return node.getMaterial(new Texture()) as ShaderMaterial
}

function vectorUniform(material: ShaderMaterial, name: string): Vector2 {
  return material.uniforms[name].value as Vector2
}

describe('bounded audio modulation centers', () => {
  it('keeps zero-depth tremolo at unity and its bounded envelope at or below unity', () => {
    const context = new FakeAudioContext()
    const module = createTremolo(context as unknown as BaseAudioContext, { depth: 0 })
    const modGain = context.gains[1]
    const depthGain = context.gains[2]
    const offset = context.constantSources[0]

    expect(modGain.gain.value + offset.offset.value).toBe(1)

    module.setParams({ depth: 0.1 })
    const center = modGain.gain.value + offset.offset.value
    const amplitude = Math.abs(depthGain.gain.value)
    expect(center - amplitude).toBeCloseTo(0.9)
    expect(center + amplitude).toBeCloseTo(1)

    module.dispose()
    expect(context.oscillators[0].stopped).toBe(true)
    expect(offset.stopped).toBe(true)
  })

  it('uses one eight-millisecond center for flutter and keeps runtime depth adjustable', () => {
    const context = new FakeAudioContext()
    const module = createFlutter(context as unknown as BaseAudioContext, { depth: 0.05 })
    const delay = context.delays[0]
    const depthGain = context.gains[2]
    const offset = context.constantSources[0]

    expect(delay.delayTime.value + offset.offset.value).toBe(0.008)
    expect(depthGain.gain.value).toBeCloseTo(0.0003)

    module.setParams({ depth: 0.12 })
    expect(depthGain.gain.value).toBeCloseTo(0.00072)

    module.dispose()
    expect(context.oscillators[0].stopped).toBe(true)
    expect(offset.stopped).toBe(true)
  })
})

describe('bounded focus modulation', () => {
  it('moves less per frame when focus smoothing is higher', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(1)
    const lessSmoothed = new FocusJitterNode()
    const moreSmoothed = new FocusJitterNode()
    const lessSmoothedMaterial = materialFor(lessSmoothed)
    const moreSmoothedMaterial = materialFor(moreSmoothed)
    lessSmoothed.setParams({
      intensity: 1,
      safeMode: false,
      controlValues: { amount: 1, smoothing: 0.8 },
    })
    moreSmoothed.setParams({
      intensity: 1,
      safeMode: false,
      controlValues: { amount: 1, smoothing: 0.99 },
    })

    lessSmoothed.tick(0.1)
    moreSmoothed.tick(0.1)

    expect(vectorUniform(lessSmoothedMaterial, 'u_offset').length()).toBeGreaterThan(
      vectorUniform(moreSmoothedMaterial, 'u_offset').length(),
    )
    random.mockRestore()
  })

  it('returns focus jitter to a neutral offset as soon as amount reaches zero', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(1)
    const node = new FocusJitterNode()
    const material = materialFor(node)
    node.setParams({ intensity: 1, safeMode: false, controlValues: { amount: 1 } })
    node.tick(0.1)
    expect(vectorUniform(material, 'u_offset').length()).toBeGreaterThan(0)

    node.setParams({ intensity: 1, safeMode: false, controlValues: { amount: 0 } })
    expect(vectorUniform(material, 'u_offset').toArray()).toEqual([0, 0])
    node.tick(0.1)
    expect(vectorUniform(material, 'u_offset').toArray()).toEqual([0, 0])
    random.mockRestore()
  })
})

describe('bounded salience modulation', () => {
  it('interpolates salience anchors continuously and independently of frame subdivision', () => {
    const singleFrame = new SalienceCompetitionNode()
    const splitFrames = new SalienceCompetitionNode()
    const singleMaterial = materialFor(singleFrame)
    const splitMaterial = materialFor(splitFrames)
    const initialAnchor = vectorUniform(singleMaterial, 'u_anchor_a').clone()
    const params = {
      intensity: 1,
      safeMode: false,
      controlValues: { jump_rate: 1 },
    }
    singleFrame.setParams(params)
    splitFrames.setParams(params)

    singleFrame.tick(0.001)
    expect(initialAnchor.distanceTo(vectorUniform(singleMaterial, 'u_anchor_a'))).toBeLessThan(
      0.001,
    )
    singleFrame.tick(0.749)
    splitFrames.tick(0.25)
    splitFrames.tick(0.25)
    splitFrames.tick(0.25)

    expect(vectorUniform(splitMaterial, 'u_anchor_a').toArray()).toEqual(
      vectorUniform(singleMaterial, 'u_anchor_a').toArray(),
    )
    expect(vectorUniform(splitMaterial, 'u_anchor_b').toArray()).toEqual(
      vectorUniform(singleMaterial, 'u_anchor_b').toArray(),
    )

    const beforeBoundary = vectorUniform(singleMaterial, 'u_anchor_a').clone()
    singleFrame.tick(0.249)
    const nearBoundary = vectorUniform(singleMaterial, 'u_anchor_a').clone()
    singleFrame.tick(0.002)
    const afterBoundary = vectorUniform(singleMaterial, 'u_anchor_a').clone()
    expect(nearBoundary.distanceTo(afterBoundary)).toBeLessThan(0.001)
    expect(beforeBoundary.distanceTo(nearBoundary)).toBeGreaterThan(0)
  })
})
