import type { VideoPipelineParams } from './webglPipelineTypes'

export type OverlayRendererMode = 'webgl' | '2d' | 'raw' | 'unavailable'

export interface OverlayRuntimeState {
  rendererMode: OverlayRendererMode
  effectsActive: boolean
  error: Error | null
}

export interface OverlayRuntimeCallbacks {
  onStateChange?(state: OverlayRuntimeState): void
}

export interface OverlayDiagnostics {
  rendererMode: OverlayRendererMode
  effectsActive: boolean
  fps: number | null
  frameTimeMs: number | null
  renderScale: number
  /** Effect-chain target size in device pixels (WebGL only). */
  renderWidth?: number
  renderHeight?: number
  /** True when the last effect renders straight to the canvas (WebGL only). */
  directOutput?: boolean
  resourceCounts: {
    renderTargets: number
    temporalPairs: number
    estimatedTextures: number
    estimatedFramebuffers: number
  } | null
  activeVideoNodes: string[]
}

export interface OverlayControl {
  stop(): void
  setParams(params: VideoPipelineParams): void
  getDiagnostics?(): OverlayDiagnostics
}
