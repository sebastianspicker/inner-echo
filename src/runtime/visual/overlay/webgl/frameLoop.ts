import type { Texture, VideoTexture, WebGLRenderTarget } from 'three'
import type { AudioMetrics } from '../../../audio'
import type { VideoNode } from '../../effects/VideoNode'
import type { ReactiveLoopOptions } from './reactive'
import type { VideoMetrics } from '../videoMetrics'
import {
  FPS_DOWN_THRESHOLD,
  FPS_SAMPLES,
  FPS_UP_THRESHOLD,
  GL_ERROR_POLL_FRAMES,
  RENDER_SCALES,
  RESIZE_SETTLE_MS,
  SCALE_CHANGE_COOLDOWN_MS,
} from './constants'
import { computeNextRenderScaleIndex } from './loop'
import { resolveReactiveOverrides, writeMergedControlValues, writeUvScaleOffset } from './params'
import type { WebGLOverlayRuntimeState, WebGLSceneResources } from './pipelineState'
import {
  allocateFrameTargets,
  computeChainSize,
  countFrameTargets,
  supportsHalfFloatTargets,
} from './resources'
import { createBlitMaterial, renderQuad, writeCoverFit } from './renderHelpers'
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
    renderState.setSize(now)
    const videoReady = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
    const sourceChanged = hasNewVideoFrame(state)
    const reactiveDemand = readReactiveDemand(reactiveOptions)
    const videoMetrics = readVideoMetrics(resources, video, delta, videoReady, sourceChanged, {
      demand: reactiveDemand,
      state: metricsReadState,
    })
    if (reactiveDemand.videoMetrics) reactiveOptions?.onVideoMetrics?.(videoMetrics)
    if (videoReady) {
      renderState.renderVideoFrame(delta, videoMetrics, reactiveDemand, sourceChanged)
      state.videoFrameDirty = false
    } else clearRenderer(resources)
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
  state.halfFloatHistory = supportsHalfFloatTargets(resources.renderer)
  state.baseParams.ditherAmplitude = state.halfFloatHistory ? 0 : 1 / 255
  const setSize = (now: number): void => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (width <= 0 || height <= 0) return
    if (syncRendererSize(resources.renderer, state, width, height)) state.resizePendingSinceMs = now
    if (state.usePassthrough) return
    // While a resize settles the canvas follows immediately and the existing targets are blitted
    // into it; reallocation waits until the size holds still.
    const settled =
      state.resizePendingSinceMs !== null && now - state.resizePendingSinceMs >= RESIZE_SETTLE_MS
    if (state.sourceRT === null || settled) allocateTargets(state, nodes)
  }
  const updateRenderScale = (now: number, delta: number): void => {
    const nextScaleIndex = computeScaleIndex(state, now)
    state.prevStressMode = import.meta.env.DEV && Boolean(state.currentParams.stressMode)
    if (nextScaleIndex !== state.renderScaleIndex) {
      state.renderScaleIndex = nextScaleIndex
      state.lastScaleChangeMs = now
      if (!state.usePassthrough && state.sourceRT !== null) allocateTargets(state, nodes)
    }
    state.diagnostics.fps = state.avgFps
    state.diagnostics.frameTimeMs = delta * 1000
    state.diagnostics.renderScale = RENDER_SCALES[state.renderScaleIndex]
  }
  const coverScale: [number, number] = [1, 1]
  const coverOffset: [number, number] = [0, 0]
  const renderVideoFrame = (
    delta: number,
    metrics: VideoMetrics,
    demand: ReactiveDemand,
    sourceChanged: boolean,
  ): void => {
    if (sourceChanged) updateVideoTexture(resources.videoTexture)
    // Cover-fit happens once, in the source pass. Nodes receive identity UV mapping so a chain of
    // N nodes never crops N times.
    writeUvScaleOffset(
      video.videoWidth,
      video.videoHeight,
      container.clientWidth,
      container.clientHeight,
      coverScale,
      coverOffset,
    )
    writeCoverFit(resources.videoPassthroughMaterial, coverScale, coverOffset)
    applyReactiveState(state, reactiveOptions, demand, delta, metrics, applyState)
    state.baseParams.intensity = state.currentParams.intensity
    state.baseParams.safeMode = state.currentParams.safeMode
    state.baseParams.safetyContext = state.currentParams.safetyContext
    if (state.usePassthrough) {
      // The clean passthrough always draws straight to the canvas at drawing-buffer size.
      state.diagnostics.renderWidth = state.drawingBufferSize.x
      state.diagnostics.renderHeight = state.drawingBufferSize.y
      state.diagnostics.directOutput = true
      resources.renderer.setRenderTarget(null)
      resources.renderer.render(resources.scene, resources.camera)
      return
    }
    if (state.sourceRT !== null) renderNodeChain(nodes, resources, state, delta, sourceChanged)
  }
  return { setSize, updateRenderScale, renderVideoFrame }
}

function allocateTargets(state: WebGLOverlayRuntimeState, nodes: VideoNode[]): void {
  const size = computeChainSize(
    state.lastW,
    state.lastH,
    state.lastDpr ?? 1,
    RENDER_SCALES[state.renderScaleIndex],
  )
  allocateFrameTargets(state, nodes, size, state.halfFloatHistory)
  state.resizePendingSinceMs = null
  // Fresh targets hold no camera frame yet; the next frame must run the source pass.
  state.videoFrameDirty = true
  state.diagnostics.renderWidth = size.width
  state.diagnostics.renderHeight = size.height
  syncResourceDiagnostics(state)
}

/** Without requestVideoFrameCallback every display frame counts as a new camera frame. */
function hasNewVideoFrame(state: WebGLOverlayRuntimeState): boolean {
  return state.videoFrameCallbackId === null || state.videoFrameDirty
}

function syncRendererSize(
  renderer: WebGLSceneResources['renderer'],
  state: WebGLOverlayRuntimeState,
  width: number,
  height: number,
): boolean {
  const devicePixelRatio = Math.min(window.devicePixelRatio ?? 1, 2)
  const dimensionsChanged = width !== state.lastW || height !== state.lastH
  const dprChanged = devicePixelRatio !== state.lastDpr
  if (dprChanged) {
    state.lastDpr = devicePixelRatio
    renderer.setPixelRatio(devicePixelRatio)
  }
  if (dimensionsChanged) {
    state.lastW = width
    state.lastH = height
    renderer.setSize(width, height)
  }
  if (dimensionsChanged || dprChanged) renderer.getDrawingBufferSize(state.drawingBufferSize)
  return dimensionsChanged || dprChanged
}

function renderNodeChain(
  nodes: VideoNode[],
  resources: WebGLSceneResources,
  state: WebGLOverlayRuntimeState,
  delta: number,
  sourceChanged: boolean,
): void {
  const sourceRT = state.sourceRT as WebGLRenderTarget
  // A stale camera frame reuses last frame's source pass; nodes still run because they animate.
  if (sourceChanged) {
    const { renderer, scene, camera, videoPassthroughMaterial } = resources
    renderQuad(renderer, scene, camera, videoPassthroughMaterial, sourceRT)
  }
  const directOutput = canRenderDirectly(nodes, state, sourceRT)
  state.diagnostics.directOutput = directOutput
  const lastIndex = nodes.length - 1
  let inputTexture: Texture = sourceRT.texture
  let temporalIndex = 0
  for (const [index, node] of nodes.entries()) {
    state.baseParams.nodeIndex = index
    const toScreen = directOutput && index === lastIndex
    inputTexture = renderNode(node, inputTexture, temporalIndex, resources, state, delta, toScreen)
    if (node.needsPreviousFrame) temporalIndex += 1
  }
  if (!directOutput) blitToScreen(resources, state, inputTexture)
}

/**
 * The last node can draw straight to the canvas when it keeps no history (its output is not read
 * back next frame) and the chain runs at canvas resolution (no budget or adaptive downscale, and
 * no resize still settling).
 */
function canRenderDirectly(
  nodes: VideoNode[],
  state: WebGLOverlayRuntimeState,
  sourceRT: WebGLRenderTarget,
): boolean {
  return (
    nodes[nodes.length - 1]?.needsPreviousFrame !== true &&
    sourceRT.width === state.drawingBufferSize.x &&
    sourceRT.height === state.drawingBufferSize.y
  )
}

function blitToScreen(
  resources: WebGLSceneResources,
  state: WebGLOverlayRuntimeState,
  texture: Texture,
): void {
  state.blitMaterial ??= createBlitMaterial()
  state.blitMaterial.uniforms.u_map.value = texture
  renderQuad(resources.renderer, resources.scene, resources.camera, state.blitMaterial, null)
}

/** Non-temporal nodes alternate between the two chain targets, never writing their own input. */
function nextChainTarget(
  state: WebGLOverlayRuntimeState,
  inputTexture: Texture,
): WebGLRenderTarget {
  return inputTexture === state.chainRTs[0].texture ? state.chainRTs[1] : state.chainRTs[0]
}

/**
 * Bind the node's input first, then apply parameters and advance time, then render. Binding
 * first lets `setParams` read the live input (texel size) on the very first frame instead of
 * rendering one frame with construction defaults.
 */
function renderNode(
  node: VideoNode,
  inputTexture: Texture,
  temporalIndex: number,
  resources: WebGLSceneResources,
  state: WebGLOverlayRuntimeState,
  delta: number,
  toScreen: boolean,
): Texture {
  const { renderer, scene, camera } = resources
  const advance = (): void => {
    node.setParams(state.baseParams)
    ;(node as { tick?: (frameDelta: number) => void }).tick?.(delta)
  }
  if (!node.needsPreviousFrame) {
    const target = toScreen ? null : nextChainTarget(state, inputTexture)
    const material = node.getMaterial(inputTexture)
    advance()
    renderQuad(renderer, scene, camera, material, target)
    return target?.texture ?? inputTexture
  }
  const pingPong = state.temporalPingPong[temporalIndex]
  const previousTexture = pingPong.firstFrame
    ? inputTexture
    : (pingPong.writeIndex === 0 ? pingPong.rtB : pingPong.rtA).texture
  const writeTarget = pingPong.writeIndex === 0 ? pingPong.rtA : pingPong.rtB
  const material = node.getMaterial(inputTexture, previousTexture)
  advance()
  renderQuad(renderer, scene, camera, material, writeTarget)
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
  sourceChanged: boolean,
  { demand, state }: { demand: ReactiveDemand; state: MetricsReadState },
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
    ? resources.metricsTracker.stepFromSource(video, delta, sourceChanged)
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
    countFrameTargets(state),
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

/**
 * `gl.getError()` forces a GPU sync, so it is polled on the first three rendered frames and then
 * every `GL_ERROR_POLL_FRAMES`. Three consecutive polls with errors trigger the fallback.
 */
function hasRepeatedGlErrors(
  gl: WebGLRenderingContext,
  state: WebGLOverlayRuntimeState,
  didRender: boolean,
): boolean {
  if (!didRender) return false
  state.renderedFrameCount += 1
  const frame = state.renderedFrameCount
  if (frame > 3 && frame % GL_ERROR_POLL_FRAMES !== 0) return false
  let hadError = false
  for (let error = gl.getError(); error !== gl.NO_ERROR; error = gl.getError()) hadError = true
  state.consecutiveGlErrors = hadError ? state.consecutiveGlErrors + 1 : 0
  return state.consecutiveGlErrors >= 3
}
