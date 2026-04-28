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
  renderScale: number
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
