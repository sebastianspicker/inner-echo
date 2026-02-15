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
  stepFromCanvas(sourceCanvas: HTMLCanvasElement, deltaSec: number): VideoMetrics
  getLast(): VideoMetrics
  dispose(): void
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function smoothStep(current: number, target: number, dt: number, attack: number, release: number): number {
  const tau = target > current ? attack : release
  if (tau <= 0) return target
  const t = 1 - Math.exp(-dt / tau)
  return current + (target - current) * t
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

  const off = document.createElement('canvas')
  off.width = size
  off.height = size
  const ctx = off.getContext('2d', { willReadFrequently: true })

  let frame = 0
  let prevLuma: Float32Array | null = null
  let last: VideoMetrics = { motion: 0, luminance: 0, edge: 0, instability: 0 }

  let sm: VideoMetrics = { ...last }

  function computeOnce(sourceCanvas: HTMLCanvasElement): VideoMetrics {
    if (!ctx) return last
    // Draw from rendered canvas to low-res buffer.
    ctx.clearRect(0, 0, size, size)
    ctx.drawImage(sourceCanvas, 0, 0, size, size)
    const img = ctx.getImageData(0, 0, size, size)
    const data = img.data
    const n = size * size
    const luma = prevLuma && prevLuma.length === n ? prevLuma : new Float32Array(n)

    let sumY = 0
    let sumMotion = 0
    let sumEdge = 0

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x
        const p = i * 4
        const r = data[p] ?? 0
        const g = data[p + 1] ?? 0
        const b = data[p + 2] ?? 0
        // Rec.709 luma
        const Y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
        sumY += Y
        const prev = luma[i] ?? 0
        sumMotion += Math.abs(Y - prev)
        luma[i] = Y

        // Edge proxy: simple forward difference
        if (x < size - 1) {
          const p2 = p + 4
          const r2 = data[p2] ?? 0
          const g2 = data[p2 + 1] ?? 0
          const b2 = data[p2 + 2] ?? 0
          const Y2 = (0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2) / 255
          sumEdge += Math.abs(Y2 - Y)
        }
        if (y < size - 1) {
          const p3 = p + size * 4
          const r3 = data[p3] ?? 0
          const g3 = data[p3 + 1] ?? 0
          const b3 = data[p3 + 2] ?? 0
          const Y3 = (0.2126 * r3 + 0.7152 * g3 + 0.0722 * b3) / 255
          sumEdge += Math.abs(Y3 - Y)
        }
      }
    }

    prevLuma = luma
    const luminance = sumY / n
    // Normalize heuristically.
    const motion = clamp01((sumMotion / n) * 6)
    const edge = clamp01((sumEdge / (n * 2)) * 5)
    const instability = clamp01(motion * edge * 1.5)
    return { motion, luminance: clamp01(luminance), edge, instability }
  }

  return {
    stepFromCanvas(sourceCanvas: HTMLCanvasElement, deltaSec: number): VideoMetrics {
      frame++
      if (frame % everyN === 0) {
        last = computeOnce(sourceCanvas)
      }
      sm = {
        motion: smoothStep(sm.motion, last.motion, deltaSec, attack, release),
        luminance: smoothStep(sm.luminance, last.luminance, deltaSec, attack, release),
        edge: smoothStep(sm.edge, last.edge, deltaSec, attack, release),
        instability: smoothStep(sm.instability, last.instability, deltaSec, attack, release),
      }
      return sm
    },
    getLast(): VideoMetrics {
      return sm
    },
    dispose(): void {
      // release references
      prevLuma = null
    },
  }
}

