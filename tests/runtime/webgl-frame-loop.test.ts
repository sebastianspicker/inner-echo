import { MeshBasicMaterial, NoColorSpace, SRGBColorSpace, type Texture } from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { VideoNode } from '../../src/runtime/visual/effects/VideoNode'
import { createFrameLoop } from '../../src/runtime/visual/overlay/webgl/frameLoop'
import type { ReactiveLoopOptions } from '../../src/runtime/visual/overlay/webgl/reactive'
import {
  createOverlayRuntimeState,
  type WebGLSceneResources,
} from '../../src/runtime/visual/overlay/webgl/pipelineState'

function createNode(needsPreviousFrame = false): VideoNode {
  return {
    needsPreviousFrame,
    setParams: vi.fn(),
    getMaterial: vi.fn(() => new MeshBasicMaterial()),
    dispose: vi.fn(),
  }
}

function createFrameHarness(
  nodes: VideoNode[],
  width = 320,
  height = 180,
  reactiveOptions?: ReactiveLoopOptions,
) {
  let now = 0
  const renderer = {
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    setRenderTarget: vi.fn(),
    render: vi.fn(),
    clear: vi.fn(),
  }
  const resources = {
    renderer,
    videoTexture: { update: vi.fn() },
    videoPassthroughMaterial: new MeshBasicMaterial(),
    scene: { children: [{ isMesh: true, material: null }] },
    camera: {},
    gl: { NO_ERROR: 0, getError: vi.fn(() => 0) },
    metricsTracker: {
      stepFromSource: vi.fn(() => ({ motion: 0, luminance: 0, edge: 0, instability: 0 })),
      getLast: vi.fn(() => ({ motion: 0, luminance: 0, edge: 0, instability: 0 })),
      resetTemporalHistory: vi.fn(),
      dispose: vi.fn(),
    },
  } as unknown as WebGLSceneResources
  const video = { readyState: 2, videoWidth: 640, videoHeight: 360 } as HTMLVideoElement
  const canvas = {} as HTMLCanvasElement
  const dimensions = { width, height }
  const container = {
    get clientWidth() {
      return dimensions.width
    },
    get clientHeight() {
      return dimensions.height
    },
  } as HTMLElement
  const state = createOverlayRuntimeState(nodes)
  const loop = createFrameLoop({
    video,
    canvas,
    container,
    nodes,
    resources,
    state,
    reactiveOptions,
    failAndFallback: vi.fn(),
  })
  return {
    container,
    loop,
    renderer,
    resources,
    state,
    resize(nextWidth: number, nextHeight: number) {
      dimensions.width = nextWidth
      dimensions.height = nextHeight
    },
    setNow(value: number) {
      now = value
    },
    step(deltaMs = 1000 / 60) {
      now += deltaMs
      loop()
    },
    now: () => now,
  }
}

beforeEach(() => {
  vi.stubGlobal('window', { devicePixelRatio: 1 })
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.spyOn(performance, 'now').mockImplementation(() => 0)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('WebGL renderer output sizing', () => {
  it('does no renderer sizing work during 60 stationary frames after setup', () => {
    const harness = createFrameHarness([createNode()])
    vi.mocked(performance.now).mockImplementation(harness.now)

    harness.step()
    expect(harness.renderer.setPixelRatio).toHaveBeenCalledOnce()
    expect(harness.renderer.setPixelRatio).toHaveBeenCalledWith(1)
    expect(harness.renderer.setSize).toHaveBeenCalledOnce()
    expect(harness.renderer.setSize).toHaveBeenCalledWith(320, 180)
    const initialMaterialVersion = harness.state.finalBlitMaterial?.version
    harness.renderer.setPixelRatio.mockClear()
    harness.renderer.setSize.mockClear()

    for (let frame = 0; frame < 60; frame++) harness.step()

    expect(harness.renderer.setPixelRatio).not.toHaveBeenCalled()
    expect(harness.renderer.setSize).not.toHaveBeenCalled()
    expect(harness.state.chainRTs).toHaveLength(2)
    expect(harness.state.chainRTs[0]).toMatchObject({ width: 320, height: 180 })
    expect(harness.state.finalBlitMaterial?.version).toBe(initialMaterialVersion)
  })

  it('caps and detects DPR-only changes without reallocating internal targets', () => {
    const harness = createFrameHarness([createNode()])
    vi.mocked(performance.now).mockImplementation(harness.now)
    harness.step()
    const initialTargets = harness.state.chainRTs.slice()

    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 })
    harness.step()
    harness.step()

    expect(harness.renderer.setPixelRatio.mock.calls).toEqual([[1], [2]])
    expect(harness.renderer.setSize).toHaveBeenCalledOnce()
    expect(harness.state.chainRTs).toEqual(initialTargets)
    expect(harness.state.chainRTs[0]).toMatchObject({ width: 320, height: 180 })
  })

  it('leaves zero-size and passthrough pipelines free of internal targets', () => {
    const harness = createFrameHarness([], 0, 0)
    vi.mocked(performance.now).mockImplementation(harness.now)

    harness.step()
    expect(harness.renderer.setPixelRatio).not.toHaveBeenCalled()
    expect(harness.renderer.setSize).not.toHaveBeenCalled()
    expect(harness.state.chainRTs).toEqual([])

    harness.resize(320, 180)
    harness.step()
    harness.step()

    expect(harness.renderer.setPixelRatio).toHaveBeenCalledOnce()
    expect(harness.renderer.setSize).toHaveBeenCalledOnce()
    expect(harness.state.chainRTs).toEqual([])
    expect(harness.state.finalBlitMaterial).toBeNull()
  })
})

describe('WebGL internal target sizing', () => {
  it('uses CSS dimensions and adaptive scale only', () => {
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 })
    const harness = createFrameHarness([createNode()])
    vi.mocked(performance.now).mockImplementation(harness.now)
    harness.step()
    const fullScaleTargets = harness.state.chainRTs.slice()
    const disposeSpies = fullScaleTargets.map((target) => vi.spyOn(target, 'dispose'))

    harness.state.frameTimes.push(...Array.from({ length: 30 }, () => 0.05))
    harness.state.lastScaleChangeMs = harness.now() - 1_000
    harness.step(50)

    expect(harness.state.diagnostics.renderScale).toBe(0.75)
    expect(harness.state.chainRTs[0]).toMatchObject({ width: 240, height: 135 })
    expect(harness.renderer.setSize).toHaveBeenCalledOnce()
    for (const dispose of disposeSpies) expect(dispose).toHaveBeenCalledOnce()

    harness.resize(400, 200)
    harness.step(50)

    expect(harness.renderer.setSize).toHaveBeenLastCalledWith(400, 200)
    expect(harness.state.chainRTs[0]).toMatchObject({ width: 300, height: 150 })
  })

  it('resets temporal history on resize and recompiles the final blit only on map attach', () => {
    const node = createNode(true)
    const getMaterial = vi.mocked(node.getMaterial)
    const harness = createFrameHarness([node])
    vi.mocked(performance.now).mockImplementation(harness.now)

    harness.step()
    const firstTargets = harness.state.temporalPingPong.slice()
    const disposeA = vi.spyOn(firstTargets[0].rtA, 'dispose')
    const disposeB = vi.spyOn(firstTargets[0].rtB, 'dispose')
    const firstInput = harness.state.chainRTs[0].texture
    expect(getMaterial).toHaveBeenLastCalledWith(firstInput, firstInput)
    expect(harness.state.finalBlitMaterial?.map).toBe(firstTargets[0].rtA.texture)

    harness.step()
    expect(getMaterial).toHaveBeenLastCalledWith(firstInput, firstTargets[0].rtA.texture)
    expect(harness.state.finalBlitMaterial?.map).toBe(firstTargets[0].rtB.texture)

    harness.resize(400, 200)
    harness.step()
    const resizedInput = harness.state.chainRTs[0].texture
    expect(harness.state.temporalPingPong[0]).not.toBe(firstTargets[0])
    expect(disposeA).toHaveBeenCalledOnce()
    expect(disposeB).toHaveBeenCalledOnce()
    expect(getMaterial).toHaveBeenLastCalledWith(resizedInput, resizedInput)
    expect(harness.state.finalBlitMaterial?.map).toBe(harness.state.temporalPingPong[0].rtA.texture)
    expect(harness.state.finalBlitMaterial?.version).toBe(1)
  })
})

describe('WebGL final blit shader invalidation', () => {
  it('invalidates the final blit when the same map changes shader-relevant properties', () => {
    const harness = createFrameHarness([createNode()])
    vi.mocked(performance.now).mockImplementation(harness.now)
    harness.step()
    const material = harness.state.finalBlitMaterial
    const map = material?.map as Texture & { isVideoTexture?: boolean }
    expect(material?.version).toBe(1)

    map.channel = 1
    harness.step()
    expect(material?.version).toBe(2)

    map.isVideoTexture = true
    harness.step()
    expect(material?.version).toBe(2)

    map.colorSpace = SRGBColorSpace
    harness.step()
    expect(material?.version).toBe(3)

    map.colorSpace = NoColorSpace
    harness.step()
    expect(material?.version).toBe(4)
    harness.step()
    expect(material?.version).toBe(4)
  })
})

describe('WebGL reactive sampling demand', () => {
  it('skips unused metrics and resumes sampling from live demand without rebuilding', () => {
    let active = false
    const onInactive = vi.fn()
    const reactiveOptions: ReactiveLoopOptions = {
      needsVideoMetrics: () => active,
      needsAudioMetrics: () => active,
      needsOverrides: () => active,
      getAudioMetrics: vi.fn(() => ({ rms: 0, centroid: 0, flux: 0 })),
      getOverrides: vi.fn(() => ({ video: {}, audio: {} })),
      onVideoMetrics: vi.fn(),
      onInactive,
    }
    const harness = createFrameHarness([createNode()], 320, 180, reactiveOptions)
    harness.resources.metricsTracker.stepFromSource = vi.fn(() => ({
      motion: 0.8,
      luminance: 0.4,
      edge: 0.5,
      instability: 0.4,
    }))
    vi.mocked(performance.now).mockImplementation(harness.now)

    harness.step()
    expect(harness.resources.metricsTracker.stepFromSource).not.toHaveBeenCalled()
    expect(reactiveOptions.getAudioMetrics).not.toHaveBeenCalled()
    expect(reactiveOptions.getOverrides).not.toHaveBeenCalled()
    expect(reactiveOptions.onVideoMetrics).not.toHaveBeenCalled()
    expect(onInactive).toHaveBeenCalledOnce()

    active = true
    harness.step()
    expect(harness.resources.metricsTracker.stepFromSource).toHaveBeenCalledOnce()
    expect(reactiveOptions.getAudioMetrics).toHaveBeenCalledOnce()
    expect(reactiveOptions.getOverrides).toHaveBeenCalledOnce()
    expect(harness.resources.metricsTracker.resetTemporalHistory).toHaveBeenCalledOnce()
    expect(reactiveOptions.onVideoMetrics).toHaveBeenCalledOnce()

    active = false
    harness.step()
    harness.step()
    expect(onInactive).toHaveBeenCalledTimes(2)
    expect(harness.resources.metricsTracker.stepFromSource).toHaveBeenCalledOnce()
  })

  it('clears applied audio overrides once when reactive demand turns off', () => {
    let active = true
    const applyAudioOverrides = vi.fn()
    const reactiveOptions: ReactiveLoopOptions = {
      needsVideoMetrics: () => active,
      needsAudioMetrics: () => active,
      needsOverrides: () => active,
      getAudioMetrics: () => ({ rms: 1, centroid: 1, flux: 1 }),
      getOverrides: () => ({
        video: {},
        audio: active ? { 'audio.0.depth': 0.1 } : {},
      }),
      applyAudioOverrides,
    }
    const harness = createFrameHarness([createNode()], 320, 180, reactiveOptions)
    vi.mocked(performance.now).mockImplementation(harness.now)

    harness.step()
    active = false
    harness.step()
    harness.step()

    expect(applyAudioOverrides.mock.calls).toEqual([[{ 'audio.0.depth': 0.1 }], [{}]])
  })
})
