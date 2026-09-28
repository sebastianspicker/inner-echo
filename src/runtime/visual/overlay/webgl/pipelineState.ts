import type {
  MeshBasicMaterial,
  Material,
  OrthographicCamera,
  Scene,
  VideoTexture,
  WebGLRenderer,
  WebGLRenderTarget,
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
  videoPassthroughMaterial: Material
  scene: Scene
  camera: OrthographicCamera
  gl: WebGLRenderingContext
  metricsTracker: ReturnType<typeof createVideoMetricsTracker>
}

export interface FinalBlitMapShaderSignature {
  channel: number
  decodeVideoTexture: boolean
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
  }
  readonly frameTimes: number[]
  readonly diagnostics: WebGLDiagnostics
  chainRTs: WebGLRenderTarget[]
  finalBlitMaterial: MeshBasicMaterial | null
  finalBlitMapShaderSignature: FinalBlitMapShaderSignature | null
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
    },
    frameTimes: [],
    diagnostics: createDiagnostics(
      nodes.map((node) => toNodeName(node)),
      RENDER_SCALES[0],
    ),
    chainRTs: [],
    finalBlitMaterial: null,
    finalBlitMapShaderSignature: null,
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
