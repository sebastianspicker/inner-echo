import {
  ColorManagement,
  MeshBasicMaterial,
  SRGBTransfer,
  type Texture,
  type VideoTexture,
} from 'three'
import type { AudioMetrics } from '../../../audio'
import type { VideoNode } from '../../effects/VideoNode'
import type { ReactiveLoopOptions } from './reactive'
import type { VideoMetrics } from '../videoMetrics'
import {
  FPS_DOWN_THRESHOLD,
  FPS_SAMPLES,
  FPS_UP_THRESHOLD,
  RENDER_SCALES,
  SCALE_CHANGE_COOLDOWN_MS,
} from './constants'
import { computeNextRenderScaleIndex } from './loop'
import { resolveReactiveOverrides, writeMergedControlValues, writeUvScaleOffset } from './params'
import type {
  FinalBlitMapShaderSignature,
  WebGLOverlayRuntimeState,
  WebGLSceneResources,
} from './pipelineState'
import { allocateRenderTargets, disposeChainRenderTargets, disposeTemporalPairs } from './resources'
import { renderQuad } from './renderHelpers'
import { updateResourceDiagnostics } from './diagnostics'

const EMPTY_AUDIO_METRICS: AudioMetrics = { rms: 0, centroid: 0, flux: 0 }
const EMPTY_VIDEO_METRICS: VideoMetrics = { motion: 0, luminance: 0, edge: 0, instability: 0 }

interface ReactiveDemand {
  videoMetrics: boolean
  audioMetrics: boolean
  overrides: boolean
}

interface ReactiveApplyState {
  hasAppliedAudioOverrides: boolean
  inactiveNotified: boolean
}

interface MetricsReadState {
  resetBeforeNextSample: boolean
}

export type FrameLoopOptions = {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  container: HTMLElement
  nodes: VideoNode[]
  resources: WebGLSceneResources
  state: WebGLOverlayRuntimeState
  reactiveOptions?: ReactiveLoopOptions | null
  failAndFallback(message: string): void
}

export function createFrameLoop(options: FrameLoopOptions): () => void {
  const renderState = createRenderState(options)
  const metricsReadState: MetricsReadState = { resetBeforeNextSample: false }
  return function loop(): void {
    const { state, video, canvas, container, resources, reactiveOptions, failAndFallback } = options
    if (state.stopped) return
    state.rafId = null
    const now = performance.now()
    const delta = updateFrameTiming(state, now)
    renderState.updateRenderScale(now, delta)
    if (!video || !canvas || !container) {
      state.rafId = requestAnimationFrame(loop)
      return
    }
    renderState.setSize()
    const videoReady = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
    const reactiveDemand = readReactiveDemand(reactiveOptions)
    const videoMetrics = readVideoMetrics(
      resources,
      video,
      delta,
      videoReady,
      reactiveDemand,
      metricsReadState,
    )
    if (reactiveDemand.videoMetrics) reactiveOptions?.onVideoMetrics?.(videoMetrics)
    if (videoReady) renderState.renderVideoFrame(delta, videoMetrics, reactiveDemand)
    else clearRenderer(resources)
    if (hasRepeatedGlErrors(resources.gl, state, videoReady)) {
      failAndFallback('Renderer switched to 2D fallback after repeated GPU errors.')
      return
    }
    state.rafId = requestAnimationFrame(loop)
  }
}

function createRenderState(options: FrameLoopOptions) {
  const { video, container, nodes, resources, state, reactiveOptions } = options
  const applyState: ReactiveApplyState = {
    hasAppliedAudioOverrides: false,
    inactiveNotified: false,
  }
  const allocateTargets = (width: number, height: number): void => {
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
    state.finalBlitMaterial ??= new MeshBasicMaterial({ map: null, depthWrite: false })
    syncResourceDiagnostics(state)
  }
  const setSize = (): void => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (width <= 0 || height <= 0) return
    const dimensionsChanged = syncRendererSize(resources.renderer, state, width, height)
    if (!state.usePassthrough && (dimensionsChanged || state.chainRTs.length === 0))
      allocateTargets(width, height)
  }
  const updateRenderScale = (now: number, delta: number): void => {
    const nextScaleIndex = computeScaleIndex(state, now)
    state.prevStressMode = import.meta.env.DEV && Boolean(state.currentParams.stressMode)
    if (nextScaleIndex !== state.renderScaleIndex) {
      state.renderScaleIndex = nextScaleIndex
      state.lastScaleChangeMs = now
      if (!state.usePassthrough && state.lastW > 0 && state.lastH > 0)
        allocateTargets(state.lastW, state.lastH)
    }
    state.diagnostics.fps = state.avgFps
    state.diagnostics.frameTimeMs = delta * 1000
    state.diagnostics.renderScale = RENDER_SCALES[state.renderScaleIndex]
  }
  const renderVideoFrame = (delta: number, metrics: VideoMetrics, demand: ReactiveDemand): void => {
    updateVideoTexture(resources.videoTexture)
    writeUvScaleOffset(
      video.videoWidth,
      video.videoHeight,
      container.clientWidth,
      container.clientHeight,
      state.baseParams.uvScale,
      state.baseParams.uvOffset,
    )
    applyReactiveState(state, reactiveOptions, demand, delta, metrics, applyState)
    state.baseParams.intensity = state.currentParams.intensity
    state.baseParams.safeMode = state.currentParams.safeMode
    state.baseParams.safetyContext = state.currentParams.safetyContext
    if (state.usePassthrough) {
      resources.renderer.setRenderTarget(null)
      resources.renderer.render(resources.scene, resources.camera)
      return
    }
    if (state.chainRTs.length === nodes.length + 1) renderNodeChain(nodes, resources, state, delta)
  }
  return { setSize, updateRenderScale, renderVideoFrame }
}

function syncRendererSize(
  renderer: WebGLSceneResources['renderer'],
  state: WebGLOverlayRuntimeState,
  width: number,
  height: number,
): boolean {
  const devicePixelRatio = Math.min(window.devicePixelRatio ?? 1, 2)
  const dimensionsChanged = width !== state.lastW || height !== state.lastH
  if (devicePixelRatio !== state.lastDpr) {
    state.lastDpr = devicePixelRatio
    renderer.setPixelRatio(devicePixelRatio)
  }
  if (dimensionsChanged) {
    state.lastW = width
    state.lastH = height
    renderer.setSize(width, height)
  }
  return dimensionsChanged
}

function renderNodeChain(
  nodes: VideoNode[],
  resources: WebGLSceneResources,
  state: WebGLOverlayRuntimeState,
  delta: number,
): void {
  const { renderer, scene, camera, videoPassthroughMaterial } = resources
  renderQuad(renderer, scene, camera, videoPassthroughMaterial, state.chainRTs[0])
  let inputTexture: Texture = state.chainRTs[0].texture
  let temporalIndex = 0
  for (const [index, node] of nodes.entries()) {
    state.baseParams.nodeIndex = index
    node.setParams(state.baseParams)
    ;(node as { tick?: (frameDelta: number) => void }).tick?.(delta)
    inputTexture = renderNode(node, inputTexture, temporalIndex, resources, state)
    if (node.needsPreviousFrame) temporalIndex += 1
  }
  if (!state.finalBlitMaterial) return
  const nextSignature = readFinalBlitMapShaderSignature(inputTexture)
  const needsMapShader = hasFinalBlitMapShaderChanged(
    state.finalBlitMapShaderSignature,
    nextSignature,
  )
  state.finalBlitMaterial.map = inputTexture
  if (needsMapShader) {
    state.finalBlitMapShaderSignature = nextSignature
    state.finalBlitMaterial.needsUpdate = true
  }
  renderer.setRenderTarget(null)
  renderer.clear()
  renderQuad(renderer, scene, camera, state.finalBlitMaterial, null)
}

function readFinalBlitMapShaderSignature(texture: Texture): FinalBlitMapShaderSignature {
  return {
    channel: texture.channel,
    decodeVideoTexture:
      (texture as Texture & { isVideoTexture?: boolean }).isVideoTexture === true &&
      ColorManagement.getTransfer(texture.colorSpace) === SRGBTransfer,
  }
}

function hasFinalBlitMapShaderChanged(
  previous: FinalBlitMapShaderSignature | null,
  next: FinalBlitMapShaderSignature,
): boolean {
  return (
    previous === null ||
    previous.channel !== next.channel ||
    previous.decodeVideoTexture !== next.decodeVideoTexture
  )
}

function renderNode(
  node: VideoNode,
  inputTexture: Texture,
  temporalIndex: number,
  resources: WebGLSceneResources,
  state: WebGLOverlayRuntimeState,
): Texture {
  const { renderer, scene, camera } = resources
  if (!node.needsPreviousFrame) {
    const target = state.chainRTs[state.baseParams.nodeIndex + 1]
    renderQuad(renderer, scene, camera, node.getMaterial(inputTexture), target)
    return target.texture
  }
  const pingPong = state.temporalPingPong[temporalIndex]
  const previousTexture = pingPong.firstFrame
    ? inputTexture
    : (pingPong.writeIndex === 0 ? pingPong.rtB : pingPong.rtA).texture
  const writeTarget = pingPong.writeIndex === 0 ? pingPong.rtA : pingPong.rtB
  renderQuad(renderer, scene, camera, node.getMaterial(inputTexture, previousTexture), writeTarget)
  if (pingPong.firstFrame) pingPong.firstFrame = false
  pingPong.writeIndex = 1 - pingPong.writeIndex
  return writeTarget.texture
}

function applyReactiveState(
  state: WebGLOverlayRuntimeState,
  reactiveOptions: ReactiveLoopOptions | null | undefined,
  reactiveDemand: ReactiveDemand,
  delta: number,
  videoMetrics: VideoMetrics,
  reactiveApplyState: ReactiveApplyState,
): void {
  const audioMetrics = reactiveDemand.audioMetrics
    ? (reactiveOptions?.getAudioMetrics?.() ?? EMPTY_AUDIO_METRICS)
    : EMPTY_AUDIO_METRICS
  const baseControlValues = (state.currentParams.controlValues ?? {}) as Record<
    string,
    number | boolean
  >
  if (reactiveDemand.overrides) reactiveApplyState.inactiveNotified = false
  else if (!reactiveApplyState.inactiveNotified) {
    reactiveOptions?.onInactive?.(baseControlValues)
    reactiveApplyState.inactiveNotified = true
  }
  const overrides = reactiveDemand.overrides
    ? reactiveOptions?.getOverrides(delta, audioMetrics, videoMetrics, baseControlValues)
    : undefined
  const { video, audio } = resolveReactiveOverrides(overrides)
  if (audio && reactiveOptions?.applyAudioOverrides) {
    reactiveOptions.applyAudioOverrides(audio)
    reactiveApplyState.hasAppliedAudioOverrides = true
  } else if (reactiveApplyState.hasAppliedAudioOverrides && reactiveOptions?.applyAudioOverrides) {
    reactiveOptions.applyAudioOverrides({})
    reactiveApplyState.hasAppliedAudioOverrides = false
  }
  writeMergedControlValues(state.mergedControlValues, baseControlValues, video)
}

function readVideoMetrics(
  resources: WebGLSceneResources,
  video: HTMLVideoElement,
  delta: number,
  videoReady: boolean,
  demand: ReactiveDemand,
  state: MetricsReadState,
): VideoMetrics {
  if (!demand.videoMetrics) {
    state.resetBeforeNextSample = true
    return EMPTY_VIDEO_METRICS
  }
  if (state.resetBeforeNextSample) {
    resources.metricsTracker.resetTemporalHistory?.()
    state.resetBeforeNextSample = false
  }
  return videoReady
    ? resources.metricsTracker.stepFromSource(video, delta)
    : resources.metricsTracker.getLast()
}

function readReactiveDemand(
  reactiveOptions: ReactiveLoopOptions | null | undefined,
): ReactiveDemand {
  if (!reactiveOptions) return { videoMetrics: false, audioMetrics: false, overrides: false }
  return {
    videoMetrics: reactiveOptions.needsVideoMetrics?.() ?? true,
    audioMetrics: reactiveOptions.needsAudioMetrics?.() ?? true,
    overrides: reactiveOptions.needsOverrides?.() ?? true,
  }
}

function updateVideoTexture(videoTexture: VideoTexture): void {
  const textureWithUpdate = videoTexture as VideoTexture & { update?: () => void }
  if (typeof textureWithUpdate.update === 'function') textureWithUpdate.update()
  else videoTexture.needsUpdate = true
}

function clearRenderer(resources: WebGLSceneResources): void {
  resources.renderer.setRenderTarget(null)
  resources.renderer.clear()
}

function syncResourceDiagnostics(state: WebGLOverlayRuntimeState): void {
  updateResourceDiagnostics(
    state.diagnostics,
    state.chainRTs.length + state.temporalPingPong.length * 2,
    state.temporalPingPong.length,
  )
}

function computeScaleIndex(state: WebGLOverlayRuntimeState, now: number): number {
  const stressMode = import.meta.env.DEV && Boolean(state.currentParams.stressMode)
  return computeNextRenderScaleIndex({
    currentIndex: state.renderScaleIndex,
    scaleCount: RENDER_SCALES.length,
    avgFps: state.avgFps,
    stressMode,
    prevStressMode: state.prevStressMode,
    nowMs: now,
    lastScaleChangeMs: state.lastScaleChangeMs,
    cooldownMs: SCALE_CHANGE_COOLDOWN_MS,
    downThreshold: FPS_DOWN_THRESHOLD,
    upThreshold: FPS_UP_THRESHOLD,
  })
}

function updateFrameTiming(state: WebGLOverlayRuntimeState, now: number): number {
  let delta = (now - state.lastTime) / 1000
  state.lastTime = now
  if (import.meta.env.DEV && state.currentParams.stressMode && delta < 0.05)
    delta = burnStressFrame(delta)
  if (delta > 0 && delta < 1) {
    state.frameTimes.push(delta)
    if (state.frameTimes.length > FPS_SAMPLES) state.frameTimes.shift()
    state.avgFps =
      1 / (state.frameTimes.reduce((total, item) => total + item, 0) / state.frameTimes.length)
  }
  return delta
}

function burnStressFrame(delta: number): number {
  const start = performance.now()
  while (performance.now() < start + 25) {}
  return Math.max(0, delta - (performance.now() - start) / 1000)
}

function hasRepeatedGlErrors(
  gl: WebGLRenderingContext,
  state: WebGLOverlayRuntimeState,
  didRender: boolean,
): boolean {
  let hadError = false
  for (let error = gl.getError(); error !== gl.NO_ERROR; error = gl.getError()) hadError = true
  if (didRender) state.consecutiveGlErrors = hadError ? state.consecutiveGlErrors + 1 : 0
  return state.consecutiveGlErrors >= 3
}
