/**
 * WebGL Rendering Pipeline (Three.js)
 *
 * Visual runtime for the webcam overlay. It turns the video element into a Three.js
 * texture, renders through the active `VideoNode` chain, and reports fatal GPU
 * failures so the canvas layer can switch to the 2D fallback.
 *
 * Data Flow:
 * 1. Raw WebRTC `<video>` is converted to a `VideoTexture`.
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

import {
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  VideoTexture,
  WebGLRenderer,
  type Material,
  type PlaneGeometry,
  type Texture,
  type WebGLRenderTarget,
} from 'three'
import type { VideoNode } from '../effects/VideoNode'
import type { VideoPipelineParams } from './webglPipelineTypes'
import { createVideoMetricsTracker, type VideoMetrics } from './videoMetrics'
import type { AudioMetrics } from '../audio'
import { logger } from '../../utils/logger'
import {
  FPS_SAMPLES,
  RENDER_SCALES,
  FPS_DOWN_THRESHOLD,
  FPS_UP_THRESHOLD,
  SCALE_CHANGE_COOLDOWN_MS,
} from './webgl/constants'
import {
  createPassthroughMaterial,
  getQuadGeometry,
  renderQuad,
  toNodeName,
} from './webgl/renderHelpers'
import {
  writeUvScaleOffset,
  resolveReactiveOverrides,
  writeMergedControlValues,
} from './webgl/params'
import { computeNextRenderScaleIndex } from './webgl/loop'
import {
  allocateRenderTargets,
  disposeChainRenderTargets,
  disposeTemporalPairs,
  type TemporalPingPongState,
} from './webgl/resources'
import {
  createDiagnostics,
  updateResourceDiagnostics,
  type WebGLDiagnostics,
} from './webgl/diagnostics'

export type { VideoPipelineParams }
export type WebGLOverlayStop = () => void

export interface WebGLOverlayControl {
  stop: WebGLOverlayStop
  setParams(params: VideoPipelineParams): void
  getDiagnostics(): WebGLDiagnostics
}

export interface WebGLOverlayCallbacks {
  onFatalRuntimeError?(error: Error): void
}

function mergePipelineParams(current: VideoPipelineParams, next: VideoPipelineParams): void {
  current.intensity = next.intensity ?? current.intensity
  current.safeMode = next.safeMode ?? current.safeMode
  current.controlValues = next.controlValues ?? current.controlValues
  current.stressMode = next.stressMode ?? current.stressMode
  current.safetyContext = next.safetyContext ?? current.safetyContext
}

/** Optional reactive/coupling callbacks used by the frame loop. */
export interface ReactiveLoopOptions {
  /** Preferred: audio metrics (RMS + spectral). */
  getAudioMetrics?(): AudioMetrics
  /**
   * Compute overrides.
   * - Return value contains structured { video, audio } overrides.
   * - `baseControlValues` is the current pipeline controlValues before overrides (UI + previous merges).
   */
  getOverrides(
    delta: number,
    audio: AudioMetrics,
    video: VideoMetrics,
    baseControlValues: Record<string, number | boolean>,
  ): {
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
  callbacks?: WebGLOverlayCallbacks,
): WebGLOverlayControl | null {
  const startupDisposers: Array<() => void> = []
  let renderer: WebGLRenderer | null = null
  let videoTexture: VideoTexture | null = null
  let videoPassthroughMaterial: Material | null = null
  let initialMeshMaterial: Material | null = null
  let geometry: PlaneGeometry | null = null
  let gl: WebGLRenderingContext | null = null
  let metricsTracker: ReturnType<typeof createVideoMetricsTracker> | null = null
  let chainRTs: WebGLRenderTarget[] = []
  const temporalPingPong: TemporalPingPongState[] = []
  let finalBlitMaterial: MeshBasicMaterial | null = null
  let rafId: number | null = null
  let stopped = false
  let cleanedUp = false
  let consecutiveGlErrors = 0
  const currentParams: VideoPipelineParams = {
    intensity: 0.5,
    safeMode: false,
    controlValues: {},
    stressMode: false,
    safetyContext: undefined,
  }

  const usePassthrough = nodes.length === 0

  function setParams(params: VideoPipelineParams): void {
    mergePipelineParams(currentParams, params)
  }

  function cleanupResources(): void {
    if (cleanedUp) return
    cleanedUp = true
    try {
      if (gl) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      }
    } catch {
      /* ignore */
    }

    for (let i = startupDisposers.length - 1; i >= 0; i--) {
      try {
        startupDisposers[i]()
      } catch {
        /* ignore */
      }
    }
    startupDisposers.length = 0
  }

  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'default',
    })
    startupDisposers.push(() => renderer?.dispose())

    const scene = new Scene()
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
    camera.position.z = 0

    videoTexture = new VideoTexture(video)
    videoTexture.minFilter = LinearFilter
    videoTexture.magFilter = LinearFilter
    videoTexture.colorSpace = SRGBColorSpace
    startupDisposers.push(() => videoTexture?.dispose())

    videoPassthroughMaterial = createPassthroughMaterial(videoTexture)
    initialMeshMaterial = usePassthrough
      ? videoPassthroughMaterial
      : new MeshBasicMaterial({ color: 0x000000, depthWrite: false })
    if (initialMeshMaterial !== videoPassthroughMaterial) {
      startupDisposers.push(() => initialMeshMaterial?.dispose())
      startupDisposers.push(() => videoPassthroughMaterial?.dispose())
    } else {
      startupDisposers.push(() => initialMeshMaterial?.dispose())
    }
    geometry = getQuadGeometry()
    startupDisposers.push(() => geometry?.dispose())
    const mesh = new Mesh(geometry, initialMeshMaterial)
    scene.add(mesh)

    metricsTracker = createVideoMetricsTracker({ size: 64, everyN: 2, attack: 0.2, release: 0.4 })
    startupDisposers.push(() => {
      metricsTracker?.dispose()
      metricsTracker = null
    })
    gl = renderer.getContext()

    const onContextLost = (event: Event): void => {
      event.preventDefault()
      logger.warn('WebGL context lost — falling back')
      stopInternal()
      callbacks?.onFatalRuntimeError?.(new Error('WebGL context lost. Render loop stopped.'))
    }
    canvas.addEventListener('webglcontextlost', onContextLost)
    startupDisposers.push(() => {
      canvas.removeEventListener('webglcontextlost', onContextLost)
    })

    let lastTime = performance.now()
    function stopInternal(): void {
      if (stopped) return
      stopped = true
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      cleanupResources()
    }

    function hasRepeatedGlErrors(didRender: boolean): boolean {
      if (!gl) return false
      let hadError = false
      let err = gl.getError()
      while (err !== gl.NO_ERROR) {
        hadError = true
        err = gl.getError()
      }
      if (didRender) {
        consecutiveGlErrors = hadError ? consecutiveGlErrors + 1 : 0
      }
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
    // Chain RTs: one per node for output (next node's input). Temporal nodes need ping-pong.
    startupDisposers.push(() => {
      disposeChainRenderTargets(chainRTs)
      chainRTs = []
    })
    startupDisposers.push(() => {
      disposeTemporalPairs(temporalPingPong)
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
    let prevStressMode = false

    // FPS guard: moving average
    const frameTimes: number[] = []
    let avgFps = 60

    // Diagnostics object is mutated each frame for the dev panel.
    // Note: activeVideoNodes reflects the initial chain configuration and is not
    // refreshed at runtime. This is intentional — the node list is static for the
    // lifetime of a single pipeline instance.
    const diagnostics: WebGLDiagnostics = createDiagnostics(
      nodes.map((node) => toNodeName(node)),
      RENDER_SCALES[0],
    )

    function syncResourceDiagnostics(): void {
      const renderTargets = chainRTs.length + temporalPingPong.length * 2
      updateResourceDiagnostics(diagnostics, renderTargets, temporalPingPong.length)
    }
    syncResourceDiagnostics()

    function allocRTs(w: number, h: number): void {
      const scale = RENDER_SCALES[renderScaleIndex]
      const rw = Math.max(1, Math.floor(w * scale))
      const rh = Math.max(1, Math.floor(h * scale))

      disposeChainRenderTargets(chainRTs)
      chainRTs = []
      disposeTemporalPairs(temporalPingPong)
      temporalPingPong.length = 0

      const allocated = allocateRenderTargets(nodes, rw, rh)
      chainRTs = allocated.chainRTs
      temporalPingPong.push(...allocated.temporalPingPong)

      if (!finalBlitMaterial) {
        finalBlitMaterial = new MeshBasicMaterial({
          map: null,
          depthWrite: false,
        })
      }
      syncResourceDiagnostics()
    }

    function setSize(): void {
      if (!renderer || !container) return
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

    function loop(): void {
      if (stopped) return
      rafId = null
      const now = performance.now()
      let delta = (now - lastTime) / 1000
      lastTime = now

      if (currentParams.stressMode && delta < 0.05) {
        // Simulate heavy load for testing: burn a few ms.
        // Capture the burn duration separately so FPS metrics reflect actual render
        // time, not the artificial busy-wait.
        const burnStart = performance.now()
        const end = burnStart + 25
        while (performance.now() < end) {}
        const burnSec = (performance.now() - burnStart) / 1000
        delta = Math.max(0, delta - burnSec)
      }

      // FPS moving average
      if (delta > 0 && delta < 1) {
        frameTimes.push(delta)
        if (frameTimes.length > FPS_SAMPLES) frameTimes.shift()
        const avgDelta = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
        avgFps = 1 / avgDelta
      }
      const currentStress = Boolean(currentParams.stressMode)
      const nextScaleIndex = computeNextRenderScaleIndex({
        currentIndex: renderScaleIndex,
        scaleCount: RENDER_SCALES.length,
        avgFps,
        stressMode: currentStress,
        prevStressMode,
        nowMs: now,
        lastScaleChangeMs,
        cooldownMs: SCALE_CHANGE_COOLDOWN_MS,
        downThreshold: FPS_DOWN_THRESHOLD,
        upThreshold: FPS_UP_THRESHOLD,
      })
      prevStressMode = currentStress
      if (nextScaleIndex !== renderScaleIndex) {
        renderScaleIndex = nextScaleIndex
        lastScaleChangeMs = now
        if (!usePassthrough && lastW > 0 && lastH > 0) allocRTs(lastW, lastH)
      }
      diagnostics.fps = avgFps
      diagnostics.frameTimeMs = delta * 1000
      diagnostics.renderScale = RENDER_SCALES[renderScaleIndex]

      if (!video || !canvas || !container || !renderer) {
        rafId = requestAnimationFrame(loop)
        return
      }
      // Capture as const so TypeScript narrows the type past the null guard above.
      const r = renderer

      setSize()

      const videoReady = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
      const cw = container.clientWidth
      const ch = container.clientHeight

      // Compute camera-source metrics so video→audio coupling has stable inputs
      // without readPixels stalls or unreliable WebGL canvas readback.
      if (!metricsTracker) {
        rafId = requestAnimationFrame(loop)
        return
      }
      const videoMetrics = videoReady
        ? metricsTracker.stepFromSource(video, delta)
        : metricsTracker.getLast()
      reactiveOptions?.onVideoMetrics?.(videoMetrics)

      if (videoReady) {
        if (
          videoTexture &&
          typeof (videoTexture as VideoTexture & { update?: () => void }).update === 'function'
        ) {
          ;(videoTexture as VideoTexture & { update: () => void }).update()
        } else if (videoTexture) {
          videoTexture.needsUpdate = true
        }
        const vw = video.videoWidth
        const vh = video.videoHeight
        writeUvScaleOffset(vw, vh, cw, ch, baseParams.uvScale, baseParams.uvOffset)

        const audioMetrics: AudioMetrics = reactiveOptions?.getAudioMetrics?.() ?? {
          rms: 0,
          centroid: 0,
          flux: 0,
        }

        const baseControlValues = (currentParams.controlValues ?? {}) as Record<
          string,
          number | boolean
        >
        const overridesRaw = reactiveOptions?.getOverrides?.(
          delta,
          audioMetrics,
          videoMetrics,
          baseControlValues,
        )
        const { video: videoOverrides, audio: audioOverrides } =
          resolveReactiveOverrides(overridesRaw)
        if (audioOverrides && reactiveOptions?.applyAudioOverrides) {
          reactiveOptions.applyAudioOverrides(audioOverrides)
        }

        writeMergedControlValues(mergedControlValues, baseControlValues, videoOverrides)

        baseParams.intensity = currentParams.intensity
        baseParams.safeMode = currentParams.safeMode
        baseParams.safetyContext = currentParams.safetyContext
        // baseParams.uvScale and uvOffset already written in-place above
        // baseParams.controlValues already points at mergedControlValues

        if (usePassthrough) {
          r.setRenderTarget(null)
          r.render(scene, camera)
        } else if (chainRTs.length === nodes.length + 1 && videoPassthroughMaterial) {
          renderQuad(r, scene, camera, videoPassthroughMaterial, chainRTs[0])
          let inputTex: Texture = chainRTs[0].texture
          let temporalIdx = 0

          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]
            baseParams.nodeIndex = i
            node.setParams(baseParams)
            const tickNode = node as { tick?: (d: number) => void }
            tickNode.tick?.(delta)

            if (node.needsPreviousFrame) {
              const pp = temporalPingPong[temporalIdx]
              const prevTex = pp.firstFrame
                ? inputTex
                : (pp.writeIndex === 0 ? pp.rtB : pp.rtA).texture
              const writeRT = pp.writeIndex === 0 ? pp.rtA : pp.rtB
              const mat = node.getMaterial(inputTex, prevTex) as Material
              renderQuad(r, scene, camera, mat, writeRT)
              if (pp.firstFrame) pp.firstFrame = false
              pp.writeIndex = 1 - pp.writeIndex
              inputTex = writeRT.texture
              temporalIdx++
            } else {
              const mat = node.getMaterial(inputTex) as Material
              renderQuad(r, scene, camera, mat, chainRTs[i + 1])
              inputTex = chainRTs[i + 1].texture
            }
          }

          if (finalBlitMaterial) {
            finalBlitMaterial.map = inputTex as Texture
            finalBlitMaterial.needsUpdate = true
            r.setRenderTarget(null)
            r.clear()
            renderQuad(r, scene, camera, finalBlitMaterial, null)
          }
        }
      } else if (renderer) {
        renderer.setRenderTarget(null)
        renderer.clear()
      }

      if (hasRepeatedGlErrors(videoReady)) {
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
      getDiagnostics: () => {
        return {
          ...diagnostics,
          resourceCounts: { ...diagnostics.resourceCounts },
          activeVideoNodes: diagnostics.activeVideoNodes.slice(),
        }
      },
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logger.error('WebGL pipeline startup failed', error)
    callbacks?.onFatalRuntimeError?.(error)
    cleanupResources()
    return null
  }
}
