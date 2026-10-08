export interface WebGLResourceCounts {
  renderTargets: number
  temporalPairs: number
  estimatedTextures: number
  estimatedFramebuffers: number
}

export interface WebGLDiagnostics {
  rendererMode: 'webgl'
  fps: number
  frameTimeMs: number
  /** Adaptive quality factor only; the target size is `renderWidth` x `renderHeight`. */
  renderScale: number
  /** Effect-chain target size in device pixels. */
  renderWidth: number
  renderHeight: number
  /** True when the last node renders straight to the canvas without a final blit. */
  directOutput: boolean
  resourceCounts: WebGLResourceCounts
  activeVideoNodes: string[]
}

export function createDiagnostics(
  activeVideoNodes: string[],
  initialRenderScale: number,
): WebGLDiagnostics {
  return {
    rendererMode: 'webgl',
    fps: 60,
    frameTimeMs: 16.67,
    renderScale: initialRenderScale,
    renderWidth: 0,
    renderHeight: 0,
    directOutput: false,
    resourceCounts: {
      renderTargets: 0,
      temporalPairs: 0,
      estimatedTextures: 0,
      estimatedFramebuffers: 0,
    },
    activeVideoNodes,
  }
}

export function updateResourceDiagnostics(
  diagnostics: WebGLDiagnostics,
  renderTargetsCount: number,
  temporalPairsCount: number,
): void {
  diagnostics.resourceCounts = {
    renderTargets: renderTargetsCount,
    temporalPairs: temporalPairsCount,
    estimatedTextures: renderTargetsCount + 1, // + input video texture
    estimatedFramebuffers: renderTargetsCount,
  }
}
