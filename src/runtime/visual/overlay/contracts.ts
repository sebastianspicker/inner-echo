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
