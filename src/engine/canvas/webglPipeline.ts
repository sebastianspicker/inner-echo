/**
 * Phase 4/5/6: Three.js WebGL pipeline driven by condition profile.
 * VideoTexture → VideoNode chain (multiple nodes, RTs) → optional ping-pong for temporal → final blit to canvas.
 * Empty video_stack = passthrough. FPS guard reduces internal render scale when FPS < 30.
 */

import * as THREE from 'three'
import type { VideoNode } from '../effects/VideoNode'
import type { VideoPipelineParams } from './webglPipelineTypes'
import { createVideoMetricsTracker, type VideoMetrics } from './videoMetrics'
import type { AudioMetrics } from '../audio'

export type { VideoPipelineParams }
export type WebGLOverlayStop = () => void

/** Phase 12: Diagnostics for dev debug panel (read each frame by consumer). */
export interface WebGLDiagnostics {
  rendererMode: 'webgl'
  fps: number
  renderScale: number
}

export interface WebGLOverlayControl {
  stop: WebGLOverlayStop
  setParams(params: VideoPipelineParams): void
  getDiagnostics(): WebGLDiagnostics
}

const FPS_TARGET = 30
const FPS_SAMPLES = 30
const RENDER_SCALES = [1.0, 0.75, 0.5] as const

/** Passthrough material: displays input texture with no effect. */
function createPassthroughMaterial(inputTexture: THREE.Texture): THREE.Material {
  return new THREE.MeshBasicMaterial({
    map: inputTexture,
    depthWrite: false,
  })
}

/** Fullscreen quad geometry (shared). */
function getQuadGeometry(): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(2, 2)
  return g
}

/** Render a quad with the given material to the given target (or null = screen). */
function renderQuad(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  material: THREE.Material,
  target: THREE.WebGLRenderTarget | null
): void {
  const mesh = scene.children[0] as THREE.Mesh
  mesh.material = material
  renderer.setRenderTarget(target)
  renderer.render(scene, camera)
}

/** Phase 8: Optional reactive (audio RMS → video param) callbacks. */
export interface ReactiveLoopOptions {
  /** Back-compat: if getAudioMetrics is not provided, getRms() will be used. */
  getRms?(): number
  /** Preferred: audio metrics (RMS + spectral). */
  getAudioMetrics?(): AudioMetrics
  /**
   * Compute overrides.
   * - Return value may be either a video overrides record (back-compat),
   *   or an object containing { video, audio }.
   * - `baseControlValues` is the current pipeline controlValues before overrides (UI + previous merges).
   */
  getOverrides(
    delta: number,
    audio: AudioMetrics,
    video: VideoMetrics,
    baseControlValues: Record<string, number | boolean>
  ):
    | Record<string, number>
    | {
        video: Record<string, number>
        audio?: Record<string, number>
      }
  /** Optional: apply audio overrides directly from the render loop. */
  applyAudioOverrides?(overrides: Record<string, number>): void
  /** Optional: observe video metrics for debug UI. */
  onVideoMetrics?(metrics: VideoMetrics): void
}

/**
 * Start the WebGL overlay loop. Builds the video chain from the given nodes.
 * Multiple nodes are chained via RenderTargets; temporal nodes use ping-pong RTs.
 * If nodes is empty, uses passthrough. FPS guard lowers internal resolution when FPS < 30.
 * Phase 8: If reactiveOptions is provided, getRms and getOverrides are called each frame and overrides are merged into controlValues.
 */
export function startWebGLOverlayLoop(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  nodes: VideoNode[],
  reactiveOptions?: ReactiveLoopOptions | null
): WebGLOverlayControl | null {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'default',
    })

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    camera.position.z = 0

    const videoTexture = new THREE.VideoTexture(video)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.colorSpace = THREE.SRGBColorSpace

    const usePassthrough = nodes.length === 0
    const geometry = getQuadGeometry()
    const mesh = new THREE.Mesh(
      geometry,
      usePassthrough
        ? createPassthroughMaterial(videoTexture)
        : new THREE.MeshBasicMaterial({ color: 0x000000 })
    )
    scene.add(mesh)

    let rafId: number | null = null
    let stopped = false
    let lastTime = performance.now()
    const metricsTracker = createVideoMetricsTracker({ size: 64, everyN: 2, attack: 0.2, release: 0.4 })

    const currentParams: VideoPipelineParams = {
      intensity: 0.5,
      safeMode: false,
      controlValues: {},
      stressMode: false,
      safetyContext: undefined,
    }

    function setParams(params: VideoPipelineParams): void {
      currentParams.intensity = params.intensity ?? currentParams.intensity
      currentParams.safeMode = params.safeMode ?? currentParams.safeMode
      currentParams.controlValues = params.controlValues ?? currentParams.controlValues
      currentParams.stressMode = params.stressMode ?? currentParams.stressMode
      currentParams.safetyContext = params.safetyContext ?? currentParams.safetyContext
    }

    // Chain RTs: one per node for output (next node's input). Temporal nodes need ping-pong.
    let chainRTs: THREE.WebGLRenderTarget[] = []
    const temporalPingPong: {
      rtA: THREE.WebGLRenderTarget
      rtB: THREE.WebGLRenderTarget
      writeIndex: number
      firstFrame: boolean
    }[] = []
    let finalBlitMaterial: THREE.MeshBasicMaterial | null = null
    let lastW = 0
    let lastH = 0
    let renderScaleIndex = 0

    // FPS guard: moving average
    const frameTimes: number[] = []
    let avgFps = 60

    // Phase 12: diagnostics object (mutated each frame for dev panel)
    const diagnostics: WebGLDiagnostics = {
      rendererMode: 'webgl',
      fps: 60,
      renderScale: RENDER_SCALES[0],
    }

    function allocRTs(w: number, h: number): void {
      const scale = RENDER_SCALES[renderScaleIndex]
      const rw = Math.max(1, Math.floor(w * scale))
      const rh = Math.max(1, Math.floor(h * scale))

      chainRTs.forEach((rt) => rt.dispose())
      chainRTs = nodes.map(
        () =>
          new THREE.WebGLRenderTarget(rw, rh, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
          })
      )

      temporalPingPong.forEach((pp) => {
        pp.rtA.dispose()
        pp.rtB.dispose()
      })
      temporalPingPong.length = 0
      nodes.forEach((node) => {
        if (node.needsPreviousFrame) {
          temporalPingPong.push({
            rtA: new THREE.WebGLRenderTarget(rw, rh, {
              minFilter: THREE.LinearFilter,
              magFilter: THREE.LinearFilter,
              format: THREE.RGBAFormat,
              type: THREE.UnsignedByteType,
            }),
            rtB: new THREE.WebGLRenderTarget(rw, rh, {
              minFilter: THREE.LinearFilter,
              magFilter: THREE.LinearFilter,
              format: THREE.RGBAFormat,
              type: THREE.UnsignedByteType,
            }),
            writeIndex: 0,
            firstFrame: true,
          })
        }
      })

      if (!finalBlitMaterial) {
        finalBlitMaterial = new THREE.MeshBasicMaterial({
          map: null,
          depthWrite: false,
        })
      }
    }

    function setSize(): void {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w <= 0 || h <= 0) return
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
      renderer.setPixelRatio(dpr)
      renderer.setSize(w, h)
      if (w !== lastW || h !== lastH || chainRTs.length === 0) {
        lastW = w
        lastH = h
        if (!usePassthrough) allocRTs(w, h)
      }
    }

    function getUvScaleOffset(
      vw: number,
      vh: number,
      cw: number,
      ch: number
    ): { uvScale: [number, number]; uvOffset: [number, number] } {
      let uvScale: [number, number] = [1, 1]
      let uvOffset: [number, number] = [0, 0]
      if (vw > 0 && vh > 0 && cw > 0 && ch > 0) {
        const videoAspect = vw / vh
        const canvasAspect = cw / ch
        const scale =
          canvasAspect >= videoAspect
            ? [1, canvasAspect / videoAspect]
            : [videoAspect / canvasAspect, 1]
        uvScale = [1 / scale[0], 1 / scale[1]]
        uvOffset = [(1 - 1 / scale[0]) * 0.5, (1 - 1 / scale[1]) * 0.5]
      }
      return { uvScale, uvOffset }
    }

    function loop(): void {
      if (stopped) return
      rafId = null
      const now = performance.now()
      const delta = (now - lastTime) / 1000
      lastTime = now

      if (currentParams.stressMode && delta < 0.05) {
        // Simulate heavy load for testing: burn a few ms
        const end = performance.now() + 25
        while (performance.now() < end) {}
      }

      // FPS moving average
      if (delta > 0 && delta < 1) {
        frameTimes.push(delta)
        if (frameTimes.length > FPS_SAMPLES) frameTimes.shift()
        const avgDelta =
          frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
        avgFps = 1 / avgDelta
      }
      const lowFps = avgFps < FPS_TARGET || currentParams.stressMode
      const nextScaleIndex = lowFps
        ? Math.min(renderScaleIndex + 1, RENDER_SCALES.length - 1)
        : Math.max(0, renderScaleIndex - 1)
      if (nextScaleIndex !== renderScaleIndex) {
        renderScaleIndex = nextScaleIndex
        if (!usePassthrough && lastW > 0 && lastH > 0) allocRTs(lastW, lastH)
      }
      diagnostics.fps = avgFps
      diagnostics.renderScale = RENDER_SCALES[renderScaleIndex]

      if (!video || !canvas || !container) {
        rafId = requestAnimationFrame(loop)
        return
      }

      setSize()

      // Compute metrics from the *previous* rendered frame (canvas contents) so we can feed video→audio coupling
      // without readPixels stalls. This is an approximation but stable at low-res.
      const videoMetrics = metricsTracker.stepFromCanvas(canvas, delta)
      reactiveOptions?.onVideoMetrics?.(videoMetrics)

      if (
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        videoTexture.needsUpdate = true
        const vw = video.videoWidth
        const vh = video.videoHeight
        const cw = container.clientWidth
        const ch = container.clientHeight
        const { uvScale, uvOffset } = getUvScaleOffset(vw, vh, cw, ch)

        const audioMetrics: AudioMetrics =
          reactiveOptions?.getAudioMetrics?.() ??
          ({ rms: reactiveOptions?.getRms?.() ?? 0, centroid: 0, flux: 0 } as AudioMetrics)

        const baseControlValues = (currentParams.controlValues ?? {}) as Record<string, number | boolean>
        const overridesRaw = reactiveOptions?.getOverrides?.(delta, audioMetrics, videoMetrics, baseControlValues)
        let videoOverrides: Record<string, number> = {}
        let audioOverrides: Record<string, number> | null = null
        if (overridesRaw && typeof overridesRaw === 'object' && 'video' in overridesRaw) {
          const o = overridesRaw as { video: Record<string, number>; audio?: Record<string, number> }
          videoOverrides = o.video ?? {}
          audioOverrides = o.audio ?? null
        } else {
          videoOverrides = (overridesRaw as Record<string, number>) ?? {}
        }
        if (audioOverrides && reactiveOptions?.applyAudioOverrides) {
          reactiveOptions.applyAudioOverrides(audioOverrides)
        }

        const controlValues = {
          ...baseControlValues,
          ...videoOverrides,
        } as Record<string, number | boolean>

        const baseParams = {
          intensity: currentParams.intensity,
          safeMode: currentParams.safeMode,
          safetyContext: currentParams.safetyContext,
          uvScale,
          uvOffset,
          controlValues,
        }

        if (usePassthrough) {
          renderer.setRenderTarget(null)
          renderer.render(scene, camera)
        } else {
          let inputTex: THREE.Texture = videoTexture
          let temporalIdx = 0

          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]
            const nodeParams = {
              ...baseParams,
              nodeIndex: i,
            }

            node.setParams(nodeParams)
            const tickNode = node as { tick?: (d: number) => void }
            tickNode.tick?.(delta)

            if (node.needsPreviousFrame) {
              const pp = temporalPingPong[temporalIdx]
              const prevTex = pp.firstFrame ? inputTex : (pp.writeIndex === 0 ? pp.rtB : pp.rtA).texture
              const writeRT = pp.writeIndex === 0 ? pp.rtA : pp.rtB
              const mat = node.getMaterial(inputTex, prevTex) as THREE.Material
              renderQuad(renderer, scene, camera, mat, writeRT)
              if (pp.firstFrame) pp.firstFrame = false
              pp.writeIndex = 1 - pp.writeIndex
              inputTex = writeRT.texture
              temporalIdx++
            } else {
              const mat = node.getMaterial(inputTex) as THREE.Material
              renderQuad(renderer, scene, camera, mat, chainRTs[i])
              inputTex = chainRTs[i].texture
            }
          }

          if (finalBlitMaterial) {
            finalBlitMaterial.map = inputTex as THREE.Texture
            finalBlitMaterial.needsUpdate = true
            renderQuad(renderer, scene, camera, finalBlitMaterial, null)
          }
        }
      }

      rafId = requestAnimationFrame(loop)
    }

    setSize()
    lastTime = performance.now()
    rafId = requestAnimationFrame(loop)

    return {
      stop(): void {
        stopped = true
        if (rafId != null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
        metricsTracker.dispose()
        if (!usePassthrough) {
          nodes.forEach((node) => node.dispose())
          chainRTs.forEach((rt) => rt.dispose())
          chainRTs = []
          temporalPingPong.forEach((pp) => {
            pp.rtA.dispose()
            pp.rtB.dispose()
          })
          temporalPingPong.length = 0
          finalBlitMaterial?.dispose()
          finalBlitMaterial = null
        } else {
          ;(mesh.material as THREE.Material).dispose()
        }
        videoTexture.dispose()
        geometry.dispose()
        renderer.dispose()
      },
      setParams,
      getDiagnostics: () => ({ ...diagnostics }),
    }
  } catch {
    return null
  }
}
