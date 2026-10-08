import {
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  LinearSRGBColorSpace,
  NoColorSpace,
  VideoTexture,
  WebGLRenderer,
} from 'three'
import { createVideoMetricsTracker } from '../videoMetrics'
import type { VideoNode } from '../../effects/VideoNode'
import { createStartupCleanup } from '../startupCleanup'
import { disposeFrameTargets } from './resources'
import type { WebGLOverlayRuntimeState, WebGLSceneResources } from './pipelineState'
import { createPassthroughMaterial, getQuadGeometry } from './renderHelpers'

export function initializeWebGLScene(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  usePassthrough: boolean,
  startupDisposers: Array<() => void>,
): WebGLSceneResources {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'default',
  })
  startupDisposers.push(() => renderer.dispose())
  // Every pass is one fullscreen quad that covers its whole target: no clears, sorting, culling
  // or per-frame matrix updates are needed.
  renderer.autoClear = false
  renderer.sortObjects = false
  const scene = new Scene()
  scene.matrixWorldAutoUpdate = false
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  camera.position.z = 0
  camera.updateMatrixWorld()
  camera.matrixAutoUpdate = false
  // The effect chain is authored in display-referred (sRGB-encoded) values: contrast pivots at
  // mid-grey, haze and veil colours are the greys a viewer sees. Keep the video bytes untouched
  // through the chain and skip the output encode, so passthrough is identical to the video and
  // the effects act on the image as displayed rather than in linear light.
  renderer.outputColorSpace = LinearSRGBColorSpace
  const videoTexture = new VideoTexture(video)
  videoTexture.minFilter = LinearFilter
  videoTexture.magFilter = LinearFilter
  videoTexture.colorSpace = NoColorSpace
  startupDisposers.push(() => videoTexture.dispose())
  const videoPassthroughMaterial = createPassthroughMaterial(videoTexture)
  const initialMeshMaterial = usePassthrough
    ? videoPassthroughMaterial
    : new MeshBasicMaterial({ color: 0x000000, depthWrite: false })
  startupDisposers.push(() => initialMeshMaterial.dispose())
  if (initialMeshMaterial !== videoPassthroughMaterial)
    startupDisposers.push(() => videoPassthroughMaterial.dispose())
  const geometry = getQuadGeometry()
  startupDisposers.push(() => geometry.dispose())
  const quad = new Mesh(geometry, initialMeshMaterial)
  quad.frustumCulled = false
  quad.matrixAutoUpdate = false
  scene.add(quad)
  scene.updateMatrixWorld()
  const metricsTracker = createVideoMetricsTracker({
    size: 64,
    everyN: 2,
    attack: 0.2,
    release: 0.4,
  })
  startupDisposers.push(() => metricsTracker.dispose())
  return {
    renderer,
    videoTexture,
    videoPassthroughMaterial,
    scene,
    camera,
    gl: renderer.getContext(),
    metricsTracker,
  }
}

export function registerRuntimeCleanup(
  startupDisposers: Array<() => void>,
  state: WebGLOverlayRuntimeState,
  nodes: VideoNode[],
): void {
  startupDisposers.push(() => disposeFrameTargets(state))
  startupDisposers.push(() => {
    state.blitMaterial?.dispose()
    state.blitMaterial = null
  })
  startupDisposers.push(() => {
    for (const node of nodes) node.dispose()
  })
}

/**
 * Mark the source frame dirty whenever the camera presents a new frame, so the frame loop can skip
 * the texture upload and source pass on display refreshes without one. Without the API every frame
 * counts as new.
 */
export function registerVideoFrameCallback(
  video: HTMLVideoElement,
  state: WebGLOverlayRuntimeState,
  startupDisposers: Array<() => void>,
): void {
  if (typeof video.requestVideoFrameCallback !== 'function') return
  const onVideoFrame = (): void => {
    if (state.stopped || state.videoFrameCallbackId === null) return
    state.videoFrameDirty = true
    state.videoFrameCallbackId = video.requestVideoFrameCallback(onVideoFrame)
  }
  state.videoFrameCallbackId = video.requestVideoFrameCallback(onVideoFrame)
  startupDisposers.push(() => {
    if (state.videoFrameCallbackId !== null)
      video.cancelVideoFrameCallback(state.videoFrameCallbackId)
    state.videoFrameCallbackId = null
  })
}

export { createStartupCleanup }
