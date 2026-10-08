import {
  type OrthographicCamera,
  type Scene,
  type ShaderMaterial,
  Vector2,
  type VideoTexture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three'
import type { VideoPipelineParams } from '../webglPipelineTypes'
import type { VideoNode } from '../../effects/VideoNode'
import { createDiagnostics, type WebGLDiagnostics } from './diagnostics'
import { RENDER_SCALES } from './constants'
import { toNodeName } from './renderHelpers'
import type { createVideoMetricsTracker } from '../videoMetrics'

export interface WebGLSceneResources {
  renderer: WebGLRenderer
  videoTexture: VideoTexture
  /** Cover-fit source pass; the only material that crops the camera frame. */
  videoPassthroughMaterial: ShaderMaterial
  scene: Scene
  camera: OrthographicCamera
  gl: WebGLRenderingContext
  metricsTracker: ReturnType<typeof createVideoMetricsTracker>
}

export interface WebGLOverlayRuntimeState {
  readonly currentParams: VideoPipelineParams
  readonly usePassthrough: boolean
  readonly temporalPingPong: import('./resources').TemporalPingPongState[]
  readonly mergedControlValues: Record<string, number | boolean>
  readonly baseParams: {
    intensity: number
    safeMode: boolean
    safetyContext: VideoPipelineParams['safetyContext']
    uvScale: [number, number]
    uvOffset: [number, number]
    controlValues: Record<string, number | boolean>
    nodeIndex: number
    ditherAmplitude: number
  }
  readonly frameTimes: number[]
  readonly diagnostics: WebGLDiagnostics
  /** Cover-fitted camera frame; node output never overwrites it, so stale frames can reuse it. */
  sourceRT: WebGLRenderTarget | null
  /** Ping-pong pair shared by all non-temporal nodes. */
  chainRTs: WebGLRenderTarget[]
  /** Final blit to the canvas when the last node cannot render there directly. */
  blitMaterial: ShaderMaterial | null
  /** Temporal history targets are half-float (no dither needed) instead of 8-bit. */
  halfFloatHistory: boolean
  /** Canvas drawing-buffer size in device pixels, refreshed whenever the renderer is resized. */
  readonly drawingBufferSize: Vector2
  /** Time the container size or DPR last changed while targets exist; null when settled. */
  resizePendingSinceMs: number | null
  /** Set by `requestVideoFrameCallback` when the camera presents a new frame. */
  videoFrameDirty: boolean
  /** Active `requestVideoFrameCallback` handle; null when the browser lacks the API. */
  videoFrameCallbackId: number | null
  renderedFrameCount: number
  rafId: number | null
  stopped: boolean
  consecutiveGlErrors: number
  lastTime: number
  lastW: number
  lastH: number
  lastDpr: number | null
  renderScaleIndex: number
  lastScaleChangeMs: number
  prevStressMode: boolean
  avgFps: number
}

export function createOverlayRuntimeState(nodes: VideoNode[]): WebGLOverlayRuntimeState {
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
      ditherAmplitude: 1 / 255,
    },
    frameTimes: [],
    diagnostics: createDiagnostics(
      nodes.map((node) => toNodeName(node)),
      RENDER_SCALES[0],
    ),
    sourceRT: null,
    chainRTs: [],
    blitMaterial: null,
    halfFloatHistory: false,
    drawingBufferSize: new Vector2(),
    resizePendingSinceMs: null,
    videoFrameDirty: true,
    videoFrameCallbackId: null,
    renderedFrameCount: 0,
    rafId: null,
    stopped: false,
    consecutiveGlErrors: 0,
    lastTime: 0,
    lastW: 0,
    lastH: 0,
    lastDpr: null,
    renderScaleIndex: 0,
    lastScaleChangeMs: 0,
    prevStressMode: false,
    avgFps: 60,
  }
}
