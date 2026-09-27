import {
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  VideoTexture,
  WebGLRenderer,
} from 'three'
import { createVideoMetricsTracker } from '../videoMetrics'
import type { VideoNode } from '../../effects/VideoNode'
import { createStartupCleanup } from '../startupCleanup'
import { disposeChainRenderTargets, disposeTemporalPairs } from './resources'
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
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  camera.position.z = 0
  const videoTexture = new VideoTexture(video)
  videoTexture.minFilter = LinearFilter
  videoTexture.magFilter = LinearFilter
  videoTexture.colorSpace = SRGBColorSpace
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
  scene.add(new Mesh(geometry, initialMeshMaterial))
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
  startupDisposers.push(() => {
    disposeChainRenderTargets(state.chainRTs)
    state.chainRTs = []
  })
  startupDisposers.push(() => {
    disposeTemporalPairs(state.temporalPingPong)
    state.temporalPingPong.length = 0
  })
  startupDisposers.push(() => {
    state.finalBlitMaterial?.dispose()
    state.finalBlitMaterial = null
    state.finalBlitMapShaderSignature = null
  })
  startupDisposers.push(() => {
    for (const node of nodes) node.dispose()
  })
}

export { createStartupCleanup }
