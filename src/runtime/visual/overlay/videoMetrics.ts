export interface VideoMetrics {
  /** 0..1 mean absolute frame diff (luma) */
  motion: number
  /** 0..1 average luminance */
  luminance: number
  /** 0..1 edge energy proxy (simple gradient magnitude) */
  edge: number
  /** 0..1 temporal instability proxy (motion * edge) */
  instability: number
}

export interface VideoMetricsTracker {
  stepFromSource(source: CanvasImageSource, deltaSec: number): VideoMetrics
  getLast(): VideoMetrics
  dispose(): void
}

import { clamp01, smoothStep } from '../../../shared/numbers'
import { computeEdgeEnergy, readLuma } from './videoMetricMath'

function createNoopVideoMetricsTracker(): VideoMetricsTracker {
  const metrics: VideoMetrics = { motion: 0, luminance: 0, edge: 0, instability: 0 }
  return {
    stepFromSource: () => metrics,
    getLast: () => metrics,
    dispose: () => {},
  }
}

export function createVideoMetricsTracker(options?: {
  /** downsample size in pixels (square) */
  size?: number
  /** compute every N frames, reuse last metrics between */
  everyN?: number
  /** smoothing time constants (sec) */
  attack?: number
  release?: number
}): VideoMetricsTracker {
  const size = Math.max(16, Math.min(128, Math.floor(options?.size ?? 64)))
  const everyN = Math.max(1, Math.floor(options?.everyN ?? 2))
  const attack = Math.max(0, options?.attack ?? 0.15)
  const release = Math.max(0, options?.release ?? 0.35)

  if (typeof document === 'undefined') {
    return createNoopVideoMetricsTracker()
  }
  let off: HTMLCanvasElement | null = document.createElement('canvas')
  off.width = size
  off.height = size
  let ctx = off.getContext('2d', { willReadFrequently: true })

  if (!ctx) {
    return createNoopVideoMetricsTracker()
  }

  let frame = 0
  let prevLuma: Float32Array | null = null
  let last: VideoMetrics = { motion: 0, luminance: 0, edge: 0, instability: 0 }

  const sm: VideoMetrics = { ...last }
  // Pre-allocated output object to avoid per-frame allocation in stepFromSource.
  const out: VideoMetrics = { ...last }

  function computeLumaMotion(
    data: Uint8ClampedArray,
    luma: Float32Array,
  ): { sumY: number; sumMotion: number } {
    let sumY = 0
    let sumMotion = 0
    for (let i = 0; i < luma.length; i++) {
      const value = readLuma(data, i * 4)
      sumY += value
      sumMotion += Math.abs(value - (luma[i] ?? 0))
      luma[i] = value
    }
    return { sumY, sumMotion }
  }

  function computeOnce(source: CanvasImageSource): VideoMetrics {
    if (!ctx) return last
    // Draw from the camera source to a low-res buffer. Reading the presented
    // WebGL canvas through 2D is not reliable across browsers/backends.
    ctx.clearRect(0, 0, size, size)
    ctx.drawImage(source, 0, 0, size, size)
    const img = ctx.getImageData(0, 0, size, size)
    const data = img.data
    const n = size * size
    const luma = prevLuma && prevLuma.length === n ? prevLuma : new Float32Array(n)

    const { sumY, sumMotion } = computeLumaMotion(data, luma)
    const sumEdge = computeEdgeEnergy(data, size)

    prevLuma = luma
    const luminance = sumY / n
    // Normalize heuristically.
    const motion = clamp01((sumMotion / n) * 6)
    const edge = clamp01((sumEdge / (n * 2)) * 5)
    const instability = clamp01(motion * edge * 1.5)
    return { motion, luminance: clamp01(luminance), edge, instability }
  }

  return {
    stepFromSource(source: CanvasImageSource, deltaSec: number): VideoMetrics {
      frame++
      if (frame % everyN === 0) {
        last = computeOnce(source)
      }
      sm.motion = smoothStep(sm.motion, last.motion, deltaSec, attack, release)
      sm.luminance = smoothStep(sm.luminance, last.luminance, deltaSec, attack, release)
      sm.edge = smoothStep(sm.edge, last.edge, deltaSec, attack, release)
      sm.instability = smoothStep(sm.instability, last.instability, deltaSec, attack, release)
      out.motion = sm.motion
      out.luminance = sm.luminance
      out.edge = sm.edge
      out.instability = sm.instability
      return out
    },
    getLast(): VideoMetrics {
      return sm
    },
    dispose(): void {
      // release references
      prevLuma = null
      if (off) {
        off.width = 0
        off.height = 0
      }
      off = null
      ctx = null
    },
  }
}
