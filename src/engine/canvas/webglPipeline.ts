/**
 * WebGL Rendering Pipeline (Three.js)
 *
 * Visual runtime for the webcam overlay. It turns the video element into a Three.js
 * texture, renders through the active `VideoNode` chain, and reports fatal GPU
 * failures so the canvas layer can switch to the 2D fallback.
 *
 * Data Flow:
 * 1. Raw WebRTC `<video>` is converted to a `VideoTexture`.
 * 2. It passes sequentially through a chain of `VideoNode`s defined by the current condition profile.
 * 3. Each node renders its output to a `WebGLRenderTarget` (FBO), which becomes the input for the next node.
 * 4. Temporal nodes (effects that need the "previous frame" like Smear) use a ping-pong buffer technique.
 * 5. The final output is blitted onto the main HTML `<canvas>`.
 *
 * Performance:
 * Includes a built-in FPS guard. If the framerate drops below 30 FPS, it automatically
 * reduces the internal render scale (resolution) to maintain smooth performance without
 * interrupting the effect.
 */

import {
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  VideoTexture,
  WebGLRenderer,
  type Material,
  type Texture,
  type WebGLRenderTarget,
} from 'three'
import type { VideoNode } from '../effects/VideoNode'
import type { VideoPipelineParams } from './webglPipelineTypes'
import { createVideoMetricsTracker, type VideoMetrics } from './videoMetrics'
import type { AudioMetrics } from '../audio'
import { logger } from '../../utils/logger'
import {
  FPS_SAMPLES,
  RENDER_SCALES,
  FPS_DOWN_THRESHOLD,
  FPS_UP_THRESHOLD,
  SCALE_CHANGE_COOLDOWN_MS,
} from './webgl/constants'
import {
  createPassthroughMaterial,
  getQuadGeometry,
  renderQuad,
  toNodeName,
} from './webgl/renderHelpers'
import {
  writeUvScaleOffset,
  resolveReactiveOverrides,
  writeMergedControlValues,
} from './webgl/params'
import { computeNextRenderScaleIndex } from './webgl/loop'
import {
  allocateRenderTargets,
  disposeChainRenderTargets,
  disposeTemporalPairs,
  type TemporalPingPongState,
} from './webgl/resources'
import {
  createDiagnostics,
  updateResourceDiagnostics,
  type WebGLDiagnostics,
} from './webgl/diagnostics'
import { createStartupCleanup } from './startupCleanup'

export type { VideoPipelineParams }
export type WebGLOverlayStop = () => void

export interface WebGLOverlayControl {
  stop: WebGLOverlayStop
  setParams(params: VideoPipelineParams): void
  getDiagnostics(): WebGLDiagnostics
}

export interface WebGLOverlayCallbacks {
  onFatalRuntimeError?(error: Error): void
}

interface WebGLSceneResources {
  renderer: WebGLRenderer
  videoTexture: VideoTexture
  videoPassthroughMaterial: Material
  scene: Scene
  camera: OrthographicCamera
  gl: WebGLRenderingContext
  metricsTracker: ReturnType<typeof createVideoMetricsTracker>
}

interface WebGLOverlayRuntimeState {
  readonly currentParams: VideoPipelineParams
  readonly usePassthrough: boolean
  readonly temporalPingPong: TemporalPingPongState[]
  readonly mergedControlValues: Record<string, number | boolean>
  readonly baseParams: {
    intensity: number
    safeMode: boolean
    safetyContext: VideoPipelineParams['safetyContext']
    uvScale: [number, number]
    uvOffset: [number, number]
    controlValues: Record<string, number | boolean>
    nodeIndex: number
  }
  readonly frameTimes: number[]
  readonly diagnostics: WebGLDiagnostics
  chainRTs: WebGLRenderTarget[]
  finalBlitMaterial: MeshBasicMaterial | null
  rafId: number | null
  stopped: boolean
  consecutiveGlErrors: number
  lastTime: number
  lastW: number
  lastH: number
  renderScaleIndex: number
  lastScaleChangeMs: number
  prevStressMode: boolean
  avgFps: number
}

interface FrameLoopOptions {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  container: HTMLElement
  nodes: VideoNode[]
  resources: WebGLSceneResources
  state: WebGLOverlayRuntimeState
  reactiveOptions?: ReactiveLoopOptions | null
  failAndFallback(message: string): void
}

function initializeWebGLScene(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  usePassthrough: boolean,
  startupDisposers: Array<() => void>,
): WebGLSceneResources {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'default',
  })
  startupDisposers.push(() => renderer.dispose())

  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  camera.position.z = 0

  const videoTexture = new VideoTexture(video)
  videoTexture.minFilter = LinearFilter
  videoTexture.magFilter = LinearFilter
  videoTexture.colorSpace = SRGBColorSpace
  startupDisposers.push(() => videoTexture.dispose())

  const videoPassthroughMaterial = createPassthroughMaterial(videoTexture)
  const initialMeshMaterial = usePassthrough
    ? videoPassthroughMaterial
    : new MeshBasicMaterial({ color: 0x000000, depthWrite: false })
  if (initialMeshMaterial !== videoPassthroughMaterial) {
    startupDisposers.push(() => initialMeshMaterial.dispose())
    startupDisposers.push(() => videoPassthroughMaterial.dispose())
  } else {
    startupDisposers.push(() => initialMeshMaterial.dispose())
  }

  const geometry = getQuadGeometry()
  startupDisposers.push(() => geometry.dispose())
  scene.add(new Mesh(geometry, initialMeshMaterial))

  const metricsTracker = createVideoMetricsTracker({
    size: 64,
    everyN: 2,
    attack: 0.2,
    release: 0.4,
  })
  startupDisposers.push(() => metricsTracker.dispose())

  return {
    renderer,
    videoTexture,
    videoPassthroughMaterial,
    scene,
    camera,
    gl: renderer.getContext(),
    metricsTracker,
  }
}

function createOverlayRuntimeState(nodes: VideoNode[]): WebGLOverlayRuntimeState {
  const mergedControlValues: Record<string, number | boolean> = {}
  return {
    currentParams: {
      intensity: 0.5,
      safeMode: false,
      controlValues: {},
      stressMode: false,
      safetyContext: undefined,
    },
    usePassthrough: nodes.length === 0,
    temporalPingPong: [],
    mergedControlValues,
    baseParams: {
      intensity: 0.5,
      safeMode: false,
      safetyContext: undefined,
      uvScale: [1, 1],
      uvOffset: [0, 0],
      controlValues: mergedControlValues,
      nodeIndex: 0,
    },
    frameTimes: [],
    diagnostics: createDiagnostics(
      nodes.map((node) => toNodeName(node)),
      RENDER_SCALES[0],
    ),
    chainRTs: [],
    finalBlitMaterial: null,
    rafId: null,
    stopped: false,
    consecutiveGlErrors: 0,
    lastTime: 0,
    lastW: 0,
    lastH: 0,
    renderScaleIndex: 0,
    lastScaleChangeMs: 0,
    prevStressMode: false,
    avgFps: 60,
  }
}

function registerRuntimeCleanup(
  startupDisposers: Array<() => void>,
  state: WebGLOverlayRuntimeState,
  nodes: VideoNode[],
): void {
  startupDisposers.push(() => {
    disposeChainRenderTargets(state.chainRTs)
    state.chainRTs = []
  })
  startupDisposers.push(() => {
    disposeTemporalPairs(state.temporalPingPong)
    state.temporalPingPong.length = 0
  })
  startupDisposers.push(() => {
    state.finalBlitMaterial?.dispose()
    state.finalBlitMaterial = null
  })
  startupDisposers.push(() => {
    nodes.forEach((node) => node.dispose())
  })
}

function registerContextLossHandler(
  canvas: HTMLCanvasElement,
  stop: () => void,
  callbacks: WebGLOverlayCallbacks | undefined,
  startupDisposers: Array<() => void>,
): void {
  const onContextLost = (event: Event): void => {
    event.preventDefault()
    logger.warn('WebGL context lost: falling back')
    stop()
    callbacks?.onFatalRuntimeError?.(new Error('WebGL context lost. Render loop stopped.'))
  }
  canvas.addEventListener('webglcontextlost', onContextLost)
  startupDisposers.push(() => {
    canvas.removeEventListener('webglcontextlost', onContextLost)
  })
}

function syncResourceDiagnostics(state: WebGLOverlayRuntimeState): void {
  const renderTargets = state.chainRTs.length + state.temporalPingPong.length * 2
  updateResourceDiagnostics(state.diagnostics, renderTargets, state.temporalPingPong.length)
}

function createFrameLoop(options: FrameLoopOptions): () => void {
  const { video, canvas, container, nodes, resources, state, reactiveOptions, failAndFallback } =
    options
  const { renderer, videoTexture, videoPassthroughMaterial, scene, camera, gl, metricsTracker } =
    resources

  function allocateTargets(width: number, height: number): void {
    const scale = RENDER_SCALES[state.renderScaleIndex]
    const renderWidth = Math.max(1, Math.floor(width * scale))
    const renderHeight = Math.max(1, Math.floor(height * scale))

    disposeChainRenderTargets(state.chainRTs)
    state.chainRTs = []
    disposeTemporalPairs(state.temporalPingPong)
    state.temporalPingPong.length = 0

    const allocated = allocateRenderTargets(nodes, renderWidth, renderHeight)
    state.chainRTs = allocated.chainRTs
    state.temporalPingPong.push(...allocated.temporalPingPong)

    if (!state.finalBlitMaterial) {
      state.finalBlitMaterial = new MeshBasicMaterial({ map: null, depthWrite: false })
    }
    syncResourceDiagnostics(state)
  }

  function setSize(): void {
    const width = container.clientWidth
    const height = container.clientHeight
    if (width <= 0 || height <= 0) return
    const devicePixelRatio = Math.min(window.devicePixelRatio ?? 1, 2)
    renderer.setPixelRatio(devicePixelRatio)
    renderer.setSize(width, height)
    if (width !== state.lastW || height !== state.lastH || state.chainRTs.length === 0) {
      state.lastW = width
      state.lastH = height
      if (!state.usePassthrough) allocateTargets(width, height)
    }
  }

  function hasRepeatedGlErrors(didRender: boolean): boolean {
    let hadError = false
    let error = gl.getError()
    while (error !== gl.NO_ERROR) {
      hadError = true
      error = gl.getError()
    }
    if (didRender) state.consecutiveGlErrors = hadError ? state.consecutiveGlErrors + 1 : 0
    return state.consecutiveGlErrors >= 3
  }

  function updateFrameTiming(now: number): number {
    let delta = (now - state.lastTime) / 1000
    state.lastTime = now

    if (import.meta.env.DEV && state.currentParams.stressMode && delta < 0.05) {
      const burnStart = performance.now()
      const end = burnStart + 25
      while (performance.now() < end) {}
      const burnSec = (performance.now() - burnStart) / 1000
      delta = Math.max(0, delta - burnSec)
    }

    if (delta > 0 && delta < 1) {
      state.frameTimes.push(delta)
      if (state.frameTimes.length > FPS_SAMPLES) state.frameTimes.shift()
      const avgDelta = state.frameTimes.reduce((a, b) => a + b, 0) / state.frameTimes.length
      state.avgFps = 1 / avgDelta
    }
    return delta
  }

  function updateRenderScale(now: number, delta: number): void {
    const currentStress = import.meta.env.DEV && Boolean(state.currentParams.stressMode)
    const nextScaleIndex = computeNextRenderScaleIndex({
      currentIndex: state.renderScaleIndex,
      scaleCount: RENDER_SCALES.length,
      avgFps: state.avgFps,
      stressMode: currentStress,
      prevStressMode: state.prevStressMode,
      nowMs: now,
      lastScaleChangeMs: state.lastScaleChangeMs,
      cooldownMs: SCALE_CHANGE_COOLDOWN_MS,
      downThreshold: FPS_DOWN_THRESHOLD,
      upThreshold: FPS_UP_THRESHOLD,
    })
    state.prevStressMode = currentStress
    if (nextScaleIndex !== state.renderScaleIndex) {
      state.renderScaleIndex = nextScaleIndex
      state.lastScaleChangeMs = now
      if (!state.usePassthrough && state.lastW > 0 && state.lastH > 0) {
        allocateTargets(state.lastW, state.lastH)
      }
    }
    state.diagnostics.fps = state.avgFps
    state.diagnostics.frameTimeMs = delta * 1000
    state.diagnostics.renderScale = RENDER_SCALES[state.renderScaleIndex]
  }

  function renderVideoFrame(delta: number, videoMetrics: VideoMetrics): void {
    if (typeof (videoTexture as VideoTexture & { update?: () => void }).update === 'function') {
      ;(videoTexture as VideoTexture & { update: () => void }).update()
    } else {
      videoTexture.needsUpdate = true
    }
    writeUvScaleOffset(
      video.videoWidth,
      video.videoHeight,
      container.clientWidth,
      container.clientHeight,
      state.baseParams.uvScale,
      state.baseParams.uvOffset,
    )

    const audioMetrics: AudioMetrics = reactiveOptions?.getAudioMetrics?.() ?? {
      rms: 0,
      centroid: 0,
      flux: 0,
    }
    const baseControlValues = (state.currentParams.controlValues ?? {}) as Record<
      string,
      number | boolean
    >
    const overridesRaw = reactiveOptions?.getOverrides?.(
      delta,
      audioMetrics,
      videoMetrics,
      baseControlValues,
    )
    const { video: videoOverrides, audio: audioOverrides } = resolveReactiveOverrides(overridesRaw)
    if (audioOverrides && reactiveOptions?.applyAudioOverrides) {
      reactiveOptions.applyAudioOverrides(audioOverrides)
    }
    writeMergedControlValues(state.mergedControlValues, baseControlValues, videoOverrides)

    state.baseParams.intensity = state.currentParams.intensity
    state.baseParams.safeMode = state.currentParams.safeMode
    state.baseParams.safetyContext = state.currentParams.safetyContext

    if (state.usePassthrough) {
      renderer.setRenderTarget(null)
      renderer.render(scene, camera)
      return
    }
    if (state.chainRTs.length !== nodes.length + 1) return

    renderQuad(renderer, scene, camera, videoPassthroughMaterial, state.chainRTs[0])
    let inputTexture: Texture = state.chainRTs[0].texture
    let temporalIndex = 0
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index]
      state.baseParams.nodeIndex = index
      node.setParams(state.baseParams)
      const tickNode = node as { tick?: (delta: number) => void }
      tickNode.tick?.(delta)

      if (node.needsPreviousFrame) {
        const pingPong = state.temporalPingPong[temporalIndex]
        const previousTexture = pingPong.firstFrame
          ? inputTexture
          : (pingPong.writeIndex === 0 ? pingPong.rtB : pingPong.rtA).texture
        const writeTarget = pingPong.writeIndex === 0 ? pingPong.rtA : pingPong.rtB
        renderQuad(
          renderer,
          scene,
          camera,
          node.getMaterial(inputTexture, previousTexture),
          writeTarget,
        )
        if (pingPong.firstFrame) pingPong.firstFrame = false
        pingPong.writeIndex = 1 - pingPong.writeIndex
        inputTexture = writeTarget.texture
        temporalIndex++
      } else {
        renderQuad(
          renderer,
          scene,
          camera,
          node.getMaterial(inputTexture),
          state.chainRTs[index + 1],
        )
        inputTexture = state.chainRTs[index + 1].texture
      }
    }

    if (state.finalBlitMaterial) {
      state.finalBlitMaterial.map = inputTexture
      state.finalBlitMaterial.needsUpdate = true
      renderer.setRenderTarget(null)
      renderer.clear()
      renderQuad(renderer, scene, camera, state.finalBlitMaterial, null)
    }
  }

  return function loop(): void {
    if (state.stopped) return
    state.rafId = null
    const now = performance.now()
    const delta = updateFrameTiming(now)
    updateRenderScale(now, delta)

    if (!video || !canvas || !container) {
      state.rafId = requestAnimationFrame(loop)
      return
    }
    setSize()

    const videoReady = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
    const videoMetrics = videoReady
      ? metricsTracker.stepFromSource(video, delta)
      : metricsTracker.getLast()
    reactiveOptions?.onVideoMetrics?.(videoMetrics)

    if (videoReady) {
      renderVideoFrame(delta, videoMetrics)
    } else {
      renderer.setRenderTarget(null)
      renderer.clear()
    }

    if (hasRepeatedGlErrors(videoReady)) {
      failAndFallback('Renderer switched to 2D fallback after repeated GPU errors.')
      return
    }
    state.rafId = requestAnimationFrame(loop)
  }
}

function createOverlayControl(
  stop: () => void,
  state: WebGLOverlayRuntimeState,
): WebGLOverlayControl {
  return {
    stop,
    setParams(params: VideoPipelineParams): void {
      mergePipelineParams(state.currentParams, params)
    },
    getDiagnostics: () => ({
      ...state.diagnostics,
      resourceCounts: { ...state.diagnostics.resourceCounts },
      activeVideoNodes: state.diagnostics.activeVideoNodes.slice(),
    }),
  }
}

function mergePipelineParams(current: VideoPipelineParams, next: VideoPipelineParams): void {
  mergeDefinedParam(current, next, 'intensity')
  mergeDefinedParam(current, next, 'safeMode')
  mergeDefinedParam(current, next, 'controlValues')
  mergeDefinedParam(current, next, 'stressMode')
  mergeDefinedParam(current, next, 'safetyContext')
}

function mergeDefinedParam<K extends keyof VideoPipelineParams>(
  current: VideoPipelineParams,
  next: VideoPipelineParams,
  key: K,
): void {
  if (next[key] !== undefined) current[key] = next[key]
}

/** Optional reactive/coupling callbacks used by the frame loop. */
export interface ReactiveLoopOptions {
  /** Preferred: audio metrics (RMS + spectral). */
  getAudioMetrics?(): AudioMetrics
  /**
   * Compute overrides.
   * - Return value contains structured { video, audio } overrides.
   * - `baseControlValues` is the current pipeline controlValues before overrides (UI + previous merges).
   */
  getOverrides(
    delta: number,
    audio: AudioMetrics,
    video: VideoMetrics,
    baseControlValues: Record<string, number | boolean>,
  ): {
    video: Record<string, number>
    audio?: Record<string, number>
  }
  /** Optional: apply audio overrides directly from the render loop. */
  applyAudioOverrides?(overrides: Record<string, number>): void
  /** Optional: observe video metrics for debug UI. */
  onVideoMetrics?(metrics: VideoMetrics): void
}

export interface WebGLOverlayStartOptions {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  container: HTMLElement
  nodes: VideoNode[]
  reactiveOptions?: ReactiveLoopOptions | null
  callbacks?: WebGLOverlayCallbacks
}

/**
 * Bootstraps and starts the WebGL render loop using `requestAnimationFrame`.
 * Continually pushes the video feed through the effect nodes and manages memory/garbage collection.
 * @returns A control object to stop the loop or inject runtime parameter changes without strict React re-renders.
 */
export function startWebGLOverlayLoop({
  video,
  canvas,
  container,
  nodes,
  reactiveOptions,
  callbacks,
}: WebGLOverlayStartOptions): WebGLOverlayControl | null {
  const startupDisposers: Array<() => void> = []
  let gl: WebGLRenderingContext | null = null
  const cleanupResources = createStartupCleanup(startupDisposers, () => gl)

  try {
    const state = createOverlayRuntimeState(nodes)
    const resources = initializeWebGLScene(video, canvas, state.usePassthrough, startupDisposers)
    gl = resources.gl

    const stop = (): void => {
      if (state.stopped) return
      state.stopped = true
      if (state.rafId != null) {
        cancelAnimationFrame(state.rafId)
        state.rafId = null
      }
      cleanupResources()
    }
    const failAndFallback = (message: string): void => {
      stop()
      callbacks?.onFatalRuntimeError?.(new Error(message))
    }

    registerContextLossHandler(canvas, stop, callbacks, startupDisposers)
    registerRuntimeCleanup(startupDisposers, state, nodes)
    syncResourceDiagnostics(state)

    state.lastTime = performance.now()
    state.lastScaleChangeMs = performance.now()
    const loop = createFrameLoop({
      video,
      canvas,
      container,
      nodes,
      resources,
      state,
      reactiveOptions,
      failAndFallback,
    })
    state.rafId = requestAnimationFrame(loop)
    return createOverlayControl(stop, state)
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error('WebGL pipeline startup failed', error)
    callbacks?.onFatalRuntimeError?.(error)
    cleanupResources()
    return null
  }
}
