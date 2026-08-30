import { WebGLRenderTarget, LinearFilter, RGBAFormat, UnsignedByteType } from 'three'

import type { VideoNode } from '../../effects/VideoNode'

export interface TemporalPingPongState {
  rtA: WebGLRenderTarget
  rtB: WebGLRenderTarget
  writeIndex: number
  firstFrame: boolean
}

export function disposeChainRenderTargets(chainRTs: WebGLRenderTarget[]): void {
  chainRTs.forEach((rt) => rt.dispose())
}

export function disposeTemporalPairs(temporalPairs: TemporalPingPongState[]): void {
  temporalPairs.forEach((pp) => {
    pp.rtA.dispose()
    pp.rtB.dispose()
  })
}

function createRenderTarget(width: number, height: number): WebGLRenderTarget {
  return new WebGLRenderTarget(width, height, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBAFormat,
    type: UnsignedByteType,
  })
}

export function allocateRenderTargets(
  nodes: VideoNode[],
  width: number,
  height: number,
): {
  chainRTs: WebGLRenderTarget[]
  temporalPingPong: TemporalPingPongState[]
} {
  const chainRTs = Array.from({ length: nodes.length + 1 }, () => createRenderTarget(width, height))
  const temporalPingPong: TemporalPingPongState[] = []

  nodes.forEach((node) => {
    if (!node.needsPreviousFrame) return
    temporalPingPong.push({
      rtA: createRenderTarget(width, height),
      rtB: createRenderTarget(width, height),
      writeIndex: 0,
      firstFrame: true,
    })
  })

  return { chainRTs, temporalPingPong }
}
