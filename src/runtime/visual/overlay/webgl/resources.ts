import {
  HalfFloatType,
  LinearFilter,
  RGBAFormat,
  UnsignedByteType,
  WebGLRenderTarget,
  type TextureDataType,
  type WebGLRenderer,
} from 'three'

import type { VideoNode } from '../../effects/VideoNode'
import { MAX_CHAIN_PIXELS } from './constants'

export interface TemporalPingPongState {
  rtA: WebGLRenderTarget
  rtB: WebGLRenderTarget
  writeIndex: number
  firstFrame: boolean
}

/**
 * Internal targets of the effect chain: the cover-fitted camera frame, one ping-pong pair shared
 * by all non-temporal nodes, and one history pair per temporal node.
 */
export interface FrameTargets {
  sourceRT: WebGLRenderTarget | null
  chainRTs: WebGLRenderTarget[]
  readonly temporalPingPong: TemporalPingPongState[]
}

export interface ChainSize {
  width: number
  height: number
}

/** Device-pixel chain size, capped by `MAX_CHAIN_PIXELS` and scaled by the adaptive factor. */
export function computeChainSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  renderScale: number,
): ChainSize {
  const devicePixels = cssWidth * cssHeight * devicePixelRatio * devicePixelRatio
  const budgetFit = Math.min(1, Math.sqrt(MAX_CHAIN_PIXELS / devicePixels))
  const factor = devicePixelRatio * budgetFit * renderScale
  return {
    width: Math.max(1, Math.floor(cssWidth * factor)),
    height: Math.max(1, Math.floor(cssHeight * factor)),
  }
}

/** Half-float history avoids 8-bit quantisation in feedback blends; WebGL2 filters it linearly. */
export function supportsHalfFloatTargets(renderer: WebGLRenderer): boolean {
  return (
    renderer.extensions.has('EXT_color_buffer_float') ||
    renderer.extensions.has('EXT_color_buffer_half_float')
  )
}

export function disposeFrameTargets(targets: FrameTargets): void {
  targets.sourceRT?.dispose()
  targets.sourceRT = null
  for (const renderTarget of targets.chainRTs) renderTarget.dispose()
  targets.chainRTs = []
  for (const pair of targets.temporalPingPong) {
    pair.rtA.dispose()
    pair.rtB.dispose()
  }
  targets.temporalPingPong.length = 0
}

function createRenderTarget(
  size: ChainSize,
  type: TextureDataType = UnsignedByteType,
): WebGLRenderTarget {
  return new WebGLRenderTarget(size.width, size.height, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    format: RGBAFormat,
    type,
    generateMipmaps: false,
    // Fullscreen passes never depth-test; with autoClear off an attached depth buffer would
    // never be cleared and could reject every fragment on drivers that zero-initialise it.
    depthBuffer: false,
    stencilBuffer: false,
  })
}

/** Replace every internal target with fresh ones of the given size. */
export function allocateFrameTargets(
  targets: FrameTargets,
  nodes: VideoNode[],
  size: ChainSize,
  halfFloatHistory: boolean,
): void {
  disposeFrameTargets(targets)
  targets.sourceRT = createRenderTarget(size)
  targets.chainRTs = [createRenderTarget(size), createRenderTarget(size)]
  const historyType = halfFloatHistory ? HalfFloatType : UnsignedByteType
  for (const node of nodes) {
    if (!node.needsPreviousFrame) continue
    targets.temporalPingPong.push({
      rtA: createRenderTarget(size, historyType),
      rtB: createRenderTarget(size, historyType),
      writeIndex: 0,
      firstFrame: true,
    })
  }
}

export function countFrameTargets(targets: FrameTargets): number {
  return (targets.sourceRT ? 1 : 0) + targets.chainRTs.length + targets.temporalPingPong.length * 2
}
