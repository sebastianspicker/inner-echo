/**
 * WebGL Rendering Pipeline (Three.js)
 * 
 * This module is the core visual engine of Inner Echo. It uses Three.js to process 
 * the raw webcam feed through a series of custom shader effects (nodes).
 * 
 * Data Flow:
 * 1. Raw WebRTC `<video>` is converted to a `THREE.VideoTexture`.
 * 2. It passes sequentially through a chain of `VideoNode`s defined by the current condition profile.
 * 3. Each node renders its output to a `WebGLRenderTarget` (FBO), which becomes the input for the next node.
 * 4. Temporal nodes (effects that need the "previous frame" like Smear) use a ping-pong buffer technique.
 * 5. The final output is blitted onto the main HTML `<canvas>`.
 * 
 * Performance:
 * Includes a built-in FPS guard. If the framerate drops below 30 FPS, it automatically
 * reduces the internal render scale (resolution) to maintain smooth performance without 
 * interrupting the effect.
 */

import * as THREE from 'three'
import type { VideoNode } from '../effects/VideoNode'
import type { VideoPipelineParams } from './webglPipelineTypes'
import { createVideoMetricsTracker, type VideoMetrics } from './videoMetrics'
import type { AudioMetrics } from '../audio'

export type { VideoPipelineParams }
export type WebGLOverlayStop = () => void

/** Phase 12: Diagnostics for dev debug panel (read each frame by consumer). */
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

export interface WebGLOverlayControl {
  stop: WebGLOverlayStop
  setParams(params: VideoPipelineParams): void
  getDiagnostics(): WebGLDiagnostics
}

export interface WebGLOverlayCallbacks {
  onFatalRuntimeError?(error: Error): void
}

const FPS_SAMPLES = 30
const RENDER_SCALES = [1.0, 0.75, 0.5] as const
const FPS_DOWN_THRESHOLD = 28
const FPS_UP_THRESHOLD = 33
const SCALE_CHANGE_COOLDOWN_MS = 900

function toNodeName(value: unknown): string {
  if (!value || typeof value !== 'object') return 'unknown'
  const ctor = (value as { constructor?: { name?: string } }).constructor?.name
  if (!ctor) return 'unknown'
  return ctor
    .replace(/Node$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
}

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
 * Bootstraps and starts the WebGL render loop using `requestAnimationFrame`.
 * Continually pushes the video feed through the effect nodes and manages memory/garbage collection.
 * 
 * @param video The source `<video>` element receiving the webcam feed.
 * @param canvas The target `<canvas>` element to draw the final result onto.
 * @param container The parent DOM element, used to determine correct aspect ratio and sizing.
 * @param nodes An array of instantiated `VideoNode` objects defining the shader effect chain.
 * @param reactiveOptions Callbacks for cross-domain coupling (e.g. passing Audio RMS data into Video shaders).
 * @param callbacks Error handling callbacks.
 * @returns A control object to stop the loop or inject runtime parameter changes without strict React re-renders.
 */
export function startWebGLOverlayLoop(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  nodes: VideoNode[],
  reactiveOptions?: ReactiveLoopOptions | null,
  callbacks?: WebGLOverlayCallbacks
): WebGLOverlayControl | null {
  const startupDisposers: Array<() => void> = []
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'default',
    })
    startupDisposers.push(() => renderer.dispose())

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    camera.position.z = 0

    const videoTexture = new THREE.VideoTexture(video)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.colorSpace = THREE.SRGBColorSpace
    startupDisposers.push(() => videoTexture.dispose())

    const usePassthrough = nodes.length === 0
    const videoPassthroughMaterial = createPassthroughMaterial(videoTexture)
    const initialMeshMaterial: THREE.Material = usePassthrough
      ? videoPassthroughMaterial
      : new THREE.MeshBasicMaterial({ color: 0x000000, depthWrite: false })
    if (initialMeshMaterial !== videoPassthroughMaterial) {
      startupDisposers.push(() => initialMeshMaterial.dispose())
      startupDisposers.push(() => videoPassthroughMaterial.dispose())
    } else {
      startupDisposers.push(() => initialMeshMaterial.dispose())
    }
    const geometry = getQuadGeometry()
    startupDisposers.push(() => geometry.dispose())
    const mesh = new THREE.Mesh(geometry, initialMeshMaterial)
    scene.add(mesh)
    const gl = renderer.getContext()

    let rafId: number | null = null
    let stopped = false
    let cleanedUp = false
    let lastTime = performance.now()
    let consecutiveGlErrors = 0
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

    function cleanupResources(): void {
      if (cleanedUp) return
      cleanedUp = true
      // Reset unpack flags before disposing. When a renderer is recreated on the same canvas/context,
      // stale pixelStore state can leak into Three.js init texture uploads and emit WebGL warnings.
      try {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      } catch {
        // Ignore lost-context / teardown-time errors.
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
        videoPassthroughMaterial.dispose()
        if (initialMeshMaterial !== videoPassthroughMaterial) {
          initialMeshMaterial.dispose()
        }
      } else {
        initialMeshMaterial.dispose()
      }
      videoTexture.dispose()
      geometry.dispose()
      renderer.dispose()
      startupDisposers.length = 0
    }

    function stopInternal(): void {
      if (stopped) return
      stopped = true
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      cleanupResources()
    }

    function hasRepeatedGlErrors(): boolean {
      let hadError = false
      let err = gl.getError()
      while (err !== gl.NO_ERROR) {
        hadError = true
        err = gl.getError()
      }
      consecutiveGlErrors = hadError ? consecutiveGlErrors + 1 : 0
      return consecutiveGlErrors >= 3
    }

    function failAndFallback(message: string): void {
      stopInternal()
      callbacks?.onFatalRuntimeError?.(new Error(message))
    }

    // Reuse objects to avoid per-frame allocations.
    const mergedControlValues: Record<string, number | boolean> = {}
    const baseParams: {
      intensity: number
      safeMode: boolean
      safetyContext: VideoPipelineParams['safetyContext']
      uvScale: [number, number]
      uvOffset: [number, number]
      controlValues: Record<string, number | boolean>
      nodeIndex: number
    } = {
      intensity: 0.5,
      safeMode: false,
      safetyContext: undefined,
      uvScale: [1, 1],
      uvOffset: [0, 0],
      controlValues: mergedControlValues,
      nodeIndex: 0,
    }
    function clearRecord(obj: Record<string, unknown>): void {
      for (const k of Object.keys(obj)) delete obj[k]
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
    startupDisposers.push(() => {
      chainRTs.forEach((rt) => rt.dispose())
      chainRTs = []
    })
    startupDisposers.push(() => {
      temporalPingPong.forEach((pp) => {
        pp.rtA.dispose()
        pp.rtB.dispose()
      })
      temporalPingPong.length = 0
    })
    startupDisposers.push(() => {
      finalBlitMaterial?.dispose()
      finalBlitMaterial = null
    })
    startupDisposers.push(() => {
      nodes.forEach((node) => node.dispose())
    })
    let lastW = 0
    let lastH = 0
    let renderScaleIndex = 0
    let lastScaleChangeMs = performance.now()

    // FPS guard: moving average
    const frameTimes: number[] = []
    let avgFps = 60

    // Phase 12: diagnostics object (mutated each frame for dev panel)
    const diagnostics: WebGLDiagnostics = {
      rendererMode: 'webgl',
      fps: 60,
      frameTimeMs: 16.67,
      renderScale: RENDER_SCALES[0],
      resourceCounts: {
        renderTargets: 0,
        temporalPairs: 0,
        estimatedTextures: 0,
        estimatedFramebuffers: 0,
      },
      activeVideoNodes: nodes.map((node) => toNodeName(node)),
    }

    function updateResourceDiagnostics(): void {
      const renderTargets = chainRTs.length + temporalPingPong.length * 2
      diagnostics.resourceCounts = {
        renderTargets,
        temporalPairs: temporalPingPong.length,
        estimatedTextures: renderTargets + 1, // + input video texture
        estimatedFramebuffers: renderTargets,
      }
    }
    updateResourceDiagnostics()

    function allocRTs(w: number, h: number): void {
      const scale = RENDER_SCALES[renderScaleIndex]
      const rw = Math.max(1, Math.floor(w * scale))
      const rh = Math.max(1, Math.floor(h * scale))

      chainRTs.forEach((rt) => rt.dispose())
      const numRTs = nodes.length + 1
      chainRTs = Array.from({ length: numRTs }, () =>
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
      updateResourceDiagnostics()
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
        while (performance.now() < end) { }
      }

      // FPS moving average
      if (delta > 0 && delta < 1) {
        frameTimes.push(delta)
        if (frameTimes.length > FPS_SAMPLES) frameTimes.shift()
        const avgDelta =
          frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
        avgFps = 1 / avgDelta
      }
      const shouldScaleDown = currentParams.stressMode || avgFps < FPS_DOWN_THRESHOLD
      const shouldScaleUp = !currentParams.stressMode && avgFps > FPS_UP_THRESHOLD
      let nextScaleIndex = renderScaleIndex
      const canSwitchScale = now - lastScaleChangeMs >= SCALE_CHANGE_COOLDOWN_MS
      if (canSwitchScale) {
        if (shouldScaleDown) {
          nextScaleIndex = Math.min(renderScaleIndex + 1, RENDER_SCALES.length - 1)
        } else if (shouldScaleUp) {
          nextScaleIndex = Math.max(0, renderScaleIndex - 1)
        }
      }
      if (nextScaleIndex !== renderScaleIndex) {
        renderScaleIndex = nextScaleIndex
        lastScaleChangeMs = now
        if (!usePassthrough && lastW > 0 && lastH > 0) allocRTs(lastW, lastH)
      }
      diagnostics.fps = avgFps
      diagnostics.frameTimeMs = delta * 1000
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

      const videoReady = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
      const cw = container.clientWidth
      const ch = container.clientHeight

      if (videoReady) {
        if (typeof (videoTexture as THREE.VideoTexture & { update?: () => void }).update === 'function') {
          (videoTexture as THREE.VideoTexture & { update: () => void }).update()
        } else {
          videoTexture.needsUpdate = true
        }
        const vw = video.videoWidth
        const vh = video.videoHeight
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
        } else if (overridesRaw && typeof overridesRaw === 'object') {
          videoOverrides = Object.fromEntries(
            Object.entries(overridesRaw).filter(
              (entry): entry is [string, number] =>
                typeof entry[1] === 'number' && Number.isFinite(entry[1])
            )
          )
        }
        if (audioOverrides && reactiveOptions?.applyAudioOverrides) {
          reactiveOptions.applyAudioOverrides(audioOverrides)
        }

        clearRecord(mergedControlValues)
        for (const k in baseControlValues) mergedControlValues[k] = baseControlValues[k]
        for (const k in videoOverrides) mergedControlValues[k] = videoOverrides[k]

        baseParams.intensity = currentParams.intensity
        baseParams.safeMode = currentParams.safeMode
        baseParams.safetyContext = currentParams.safetyContext
        baseParams.uvScale = uvScale
        baseParams.uvOffset = uvOffset
        // baseParams.controlValues already points at mergedControlValues

        if (usePassthrough) {
          renderer.setRenderTarget(null)
          renderer.render(scene, camera)
        } else if (chainRTs.length === nodes.length + 1) {
          renderQuad(renderer, scene, camera, videoPassthroughMaterial, chainRTs[0])
          let inputTex: THREE.Texture = chainRTs[0].texture
          let temporalIdx = 0

          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]
            baseParams.nodeIndex = i
            node.setParams(baseParams)
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
              renderQuad(renderer, scene, camera, mat, chainRTs[i + 1])
              inputTex = chainRTs[i + 1].texture
            }
          }

          if (finalBlitMaterial) {
            finalBlitMaterial.map = inputTex as THREE.Texture
            finalBlitMaterial.needsUpdate = true
            renderer.setRenderTarget(null)
            renderer.clear()
            renderQuad(renderer, scene, camera, finalBlitMaterial, null)
          }
        }
      } else {
        renderer.setRenderTarget(null)
        renderer.clear()
      }

      if (hasRepeatedGlErrors()) {
        failAndFallback('Renderer switched to 2D fallback after repeated GPU errors.')
        return
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return {
      stop(): void {
        stopInternal()
      },
      setParams,
      getDiagnostics: () => ({
        ...diagnostics,
        resourceCounts: { ...diagnostics.resourceCounts },
        activeVideoNodes: diagnostics.activeVideoNodes.slice(),
      }),
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('WebGL pipeline startup failed', error)
    callbacks?.onFatalRuntimeError?.(error)
    for (let i = startupDisposers.length - 1; i >= 0; i--) {
      try {
        startupDisposers[i]()
      } catch {
        // ignore cleanup errors
      }
    }
    return null
  }
}
