import { clamp01, smoothStep } from '../../../shared/numbers'
import { computeEdgeEnergy, readLuma } from './videoMetricMath'

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
  /**
   * Advance smoothing by `deltaSec`. When `sourceChanged` is false the source still shows the
   * previous frame: no readback happens and the sampling cadence does not advance.
   */
  stepFromSource(source: CanvasImageSource, deltaSec: number, sourceChanged?: boolean): VideoMetrics
  getLast(): VideoMetrics
  resetTemporalHistory(): void
  dispose(): void
}

interface VideoMetricsOptions {
  /** downsample size in pixels (square) */
  size?: number
  /** compute every N frames, reuse last metrics between */
  everyN?: number
  /** smoothing time constants (sec) */
  attack?: number
  release?: number
}

interface TrackerSettings {
  size: number
  everyN: number
  attack: number
  release: number
}

interface TrackerState extends TrackerSettings {
  canvas: HTMLCanvasElement | null
  context: CanvasRenderingContext2D | null
  frame: number
  previousLuma: Float32Array | null
  last: VideoMetrics
  smoothed: VideoMetrics
  output: VideoMetrics
  seedTemporalSample: boolean
}

const EMPTY_METRICS: VideoMetrics = { motion: 0, luminance: 0, edge: 0, instability: 0 }
const VIDEO_METRIC_KEYS: Array<keyof VideoMetrics> = ['motion', 'luminance', 'edge', 'instability']

function createNoopVideoMetricsTracker(): VideoMetricsTracker {
  const metrics = { ...EMPTY_METRICS }
  return {
    stepFromSource: () => metrics,
    getLast: () => metrics,
    resetTemporalHistory: () => {},
    dispose: () => {},
  }
}

function normalizeSettings(options?: VideoMetricsOptions): TrackerSettings {
  return {
    size: Math.max(16, Math.min(128, Math.floor(options?.size ?? 64))),
    everyN: Math.max(1, Math.floor(options?.everyN ?? 2)),
    attack: Math.max(0, options?.attack ?? 0.15),
    release: Math.max(0, options?.release ?? 0.35),
  }
}

function createTrackerState(settings: TrackerSettings): TrackerState | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = settings.size
  canvas.height = settings.size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  return {
    ...settings,
    canvas,
    context,
    frame: 0,
    previousLuma: null,
    last: { ...EMPTY_METRICS },
    smoothed: { ...EMPTY_METRICS },
    output: { ...EMPTY_METRICS },
    seedTemporalSample: false,
  }
}

function computeLumaMotion(
  data: Uint8ClampedArray,
  luma: Float32Array,
): { sumY: number; sumMotion: number } {
  let sumY = 0
  let sumMotion = 0
  for (let index = 0; index < luma.length; index++) {
    const value = readLuma(data, index * 4)
    sumY += value
    sumMotion += Math.abs(value - (luma[index] ?? 0))
    luma[index] = value
  }
  return { sumY, sumMotion }
}

function computeMetrics(state: TrackerState, source: CanvasImageSource): VideoMetrics {
  const { context, size } = state
  if (!context) return state.last
  context.clearRect(0, 0, size, size)
  context.drawImage(source, 0, 0, size, size)
  const data = context.getImageData(0, 0, size, size).data
  const pixelCount = size * size
  const luma =
    state.previousLuma?.length === pixelCount ? state.previousLuma : new Float32Array(pixelCount)
  const { sumY, sumMotion } = computeLumaMotion(data, luma)
  const sumEdge = computeEdgeEnergy(data, size)
  state.previousLuma = luma
  const motion = state.seedTemporalSample ? 0 : clamp01((sumMotion / pixelCount) * 6)
  state.seedTemporalSample = false
  const edge = clamp01((sumEdge / (pixelCount * 2)) * 5)
  return {
    motion,
    luminance: clamp01(sumY / pixelCount),
    edge,
    instability: clamp01(motion * edge * 1.5),
  }
}

function updateSmoothedMetrics(state: TrackerState, deltaSec: number): VideoMetrics {
  for (const key of VIDEO_METRIC_KEYS) {
    state.smoothed[key] = smoothStep(
      state.smoothed[key],
      state.last[key],
      deltaSec,
      state.attack,
      state.release,
    )
    state.output[key] = state.smoothed[key]
  }
  return state.output
}

function disposeTracker(state: TrackerState): void {
  state.previousLuma = null
  if (state.canvas) {
    state.canvas.width = 0
    state.canvas.height = 0
  }
  state.canvas = null
  state.context = null
}

function createActiveVideoMetricsTracker(state: TrackerState): VideoMetricsTracker {
  return {
    stepFromSource(
      source: CanvasImageSource,
      deltaSec: number,
      sourceChanged = true,
    ): VideoMetrics {
      if (sourceChanged) {
        state.frame += 1
        if (state.frame % state.everyN === 0) state.last = computeMetrics(state, source)
      }
      return updateSmoothedMetrics(state, deltaSec)
    },
    getLast: () => state.smoothed,
    resetTemporalHistory(): void {
      state.previousLuma = null
      state.last.motion = 0
      state.last.instability = 0
      state.smoothed.motion = 0
      state.smoothed.instability = 0
      state.output.motion = 0
      state.output.instability = 0
      state.seedTemporalSample = true
      state.frame = state.everyN - 1
    },
    dispose: () => disposeTracker(state),
  }
}

export function createVideoMetricsTracker(options?: VideoMetricsOptions): VideoMetricsTracker {
  const state = createTrackerState(normalizeSettings(options))
  return state ? createActiveVideoMetricsTracker(state) : createNoopVideoMetricsTracker()
}
