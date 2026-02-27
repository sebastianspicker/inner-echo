import * as THREE from 'three'

import type { VideoNode } from '../../effects/VideoNode'

export interface TemporalPingPongState {
  rtA: THREE.WebGLRenderTarget
  rtB: THREE.WebGLRenderTarget
  writeIndex: number
  firstFrame: boolean
}

export function disposeChainRenderTargets(chainRTs: THREE.WebGLRenderTarget[]): void {
  chainRTs.forEach((rt) => rt.dispose())
}

export function disposeTemporalPairs(temporalPairs: TemporalPingPongState[]): void {
  temporalPairs.forEach((pp) => {
    pp.rtA.dispose()
    pp.rtB.dispose()
  })
}

function createRenderTarget(width: number, height: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
  })
}

export function allocateRenderTargets(
  nodes: VideoNode[],
  width: number,
  height: number
): {
  chainRTs: THREE.WebGLRenderTarget[]
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
