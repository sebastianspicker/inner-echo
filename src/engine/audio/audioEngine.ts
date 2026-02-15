/**
 * Phase 7: Audio engine (no mic). User gesture → AudioContext; synth + FX chain from profile.
 * Phase 8: AnalyserNode tap post-chain for RMS → video modulation.
 * Phase 9: Optional mic (getUserMedia), permission-separate, safety gain + limiter, routing (synth/mic/mix).
 */

import { getAudioContext, startAudioContext, closeAudioContext, addAudioContextListener } from './contextManager'
import type { AudioContextStatus, MicStatus, AudioInputMode } from './types'
import type { AudioModule } from './types'
import type { AudioStackConfig } from '../../conditions/schema'
import { createSynth } from './synth'
import { createCompressor } from './fx'
import {
  buildAudioChain,
  connectAudioChain,
  rampGain,
} from './audioGraphBuilder'
import type { AudioMetrics } from './types'

const RAMP_MS = 25
const ANALYSER_FFT_SIZE = 2048

/** Phase 9: Mic limiter — threshold (dB), ratio, attack, release. */
const MIC_LIMITER_THRESHOLD = -24
const MIC_LIMITER_RATIO = 8
const MIC_LIMITER_ATTACK = 0.003
const MIC_LIMITER_RELEASE = 0.1

function ensureSize(buf: Float32Array, size: number): Float32Array {
  if (buf.length === size) return buf
  return new Float32Array(size)
}

/**
 * Compute RMS from AnalyserNode float time-domain data. Returns 0 if no data.
 * Uses a provided scratch buffer to avoid per-frame allocations.
 */
function computeRms(analyser: AnalyserNode, scratchTime: Float32Array): { rms: number; scratch: Float32Array } {
  const bufferLength = analyser.fftSize
  const data = ensureSize(scratchTime, bufferLength)
  analyser.getFloatTimeDomainData(data)
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    const x = data[i]
    sum += x * x
  }
  return { rms: data.length > 0 ? Math.sqrt(sum / data.length) : 0, scratch: data }
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

/**
 * Apply exponential smoothing: smoothed += (target - smoothed) * (1 - exp(-dt / tau)).
 */
function smoothStep(current: number, target: number, dt: number, attack: number, release: number): number {
  const tau = target > current ? attack : release
  if (tau <= 0) return target
  const t = 1 - Math.exp(-dt / tau)
  return current + (target - current) * t
}

/**
 * Compute spectral centroid and flux from analyser frequency data.
 * Returns centroid normalized 0..1 and flux 0..1 (heuristic normalization).
 */
function computeSpectralFeatures(
  analyser: AnalyserNode,
  prevMag: Float32Array | null,
  scratchDb: Float32Array
): {
  centroid: number
  flux: number
  low: number
  mid: number
  high: number
  nextPrev: Float32Array
  scratchDb: Float32Array
} {
  const n = analyser.frequencyBinCount
  const db = ensureSize(scratchDb, n)
  analyser.getFloatFrequencyData(db)

  // Convert dB to magnitude; also compute centroid.
  const sampleRate = analyser.context.sampleRate
  const nyquist = sampleRate / 2
  let sumMag = 0
  let sumWeighted = 0
  let fluxSum = 0
  let sumLow = 0
  let sumMid = 0
  let sumHigh = 0

  const nextPrev = prevMag && prevMag.length === n ? prevMag : new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const mag = 10 ** ((db[i] ?? -120) / 20) // linear amplitude
    const t = i / Math.max(1, n - 1)
    const freq = t * nyquist
    sumMag += mag
    sumWeighted += freq * mag
    const prev = nextPrev[i] ?? 0
    const diff = mag - prev
    if (diff > 0) fluxSum += diff
    nextPrev[i] = mag

    // Coarse 3-band energy split (by normalized frequency).
    if (t < 0.12) sumLow += mag
    else if (t < 0.42) sumMid += mag
    else sumHigh += mag
  }

  const centroidHz = sumMag > 0 ? sumWeighted / sumMag : 0
  const centroid = clamp01(centroidHz / Math.max(1, nyquist))

  // Flux normalization is heuristic; values are usually small. Scale and clamp.
  const flux = clamp01(fluxSum * 0.6)
  const low = sumMag > 0 ? clamp01(sumLow / sumMag) : 0
  const mid = sumMag > 0 ? clamp01(sumMid / sumMag) : 0
  const high = sumMag > 0 ? clamp01(sumHigh / sumMag) : 0
  return { centroid, flux, low, mid, high, nextPrev, scratchDb: db }
}

export interface AudioEngineCallbacks {
  onStatusChange?(status: AudioContextStatus, error?: string): void
  /** Phase 9: Mic permission/source state. */
  onMicStatusChange?(status: MicStatus, error?: string): void
}

export interface AudioEngineControl {
  /** Set master volume 0..1. */
  setMasterVolume(value: number): void
  /** Set condition audio stack (rebuilds chain with ramp). */
  setConditionAudio(audioStack: AudioStackConfig | null | undefined): void
  /** Phase 8: Current RMS (0..1-ish). Returns 0 if analyser not available. */
  getRms(): number
  /** Phase 13: Audio metrics for coupling (RMS + spectral features). */
  getMetrics(): AudioMetrics
  /** SSOT reactive: apply "audio.<chainIndex>.<param>" overrides (smoothed/clamped upstream). */
  applyReactiveParams(overrides: Record<string, number>): void
  /** Phase 9: Request mic (call only after user gesture). */
  requestMic(): void
  /** Phase 9: Stop mic and release tracks. */
  stopMic(): void
  /** Phase 9: Set input routing: synth only, mic only, or mix. */
  setInputMode(mode: AudioInputMode): void
  /** Phase 14: Set mic sensitivity (0..1). Applied as conservative pre-gain into limiter. */
  setMicSensitivity(value: number): void
  /** Phase 14: Set soft noise gate threshold (0..1). Higher = stronger gating. */
  setMicGate(value: number): void
  /** Suspend audio (e.g. Stop Everything). */
  stop(): void
}

/**
 * Create and run the audio engine. Call only after user gesture (e.g. from "Enable audio" click).
 * Returns control object and starts with optional initial profile audio_stack.
 */
export function createAudioEngine(
  initialAudioStack: AudioStackConfig | null | undefined,
  callbacks: AudioEngineCallbacks = {}
): AudioEngineControl {
  let masterGain: GainNode | null = null
  let analyserNode: AnalyserNode | null = null
  let mixer: GainNode | null = null
  let synthGain: GainNode | null = null
  let synthModule: ReturnType<typeof createSynth> | null = null
  let chain: AudioModule[] = []
  let unsubscribe: (() => void) | null = null
  let switchTimeoutId: ReturnType<typeof setTimeout> | null = null
  let prevSpectrumMag: Float32Array | null = null
  let scratchMainTime = new Float32Array(ANALYSER_FFT_SIZE)
  let scratchMainDb = new Float32Array(ANALYSER_FFT_SIZE)

  // Phase 9: Mic — stream and nodes (only when mic is on).
  let micStream: MediaStream | null = null
  let micSource: MediaStreamAudioSourceNode | null = null
  let micPreGain: GainNode | null = null
  let micLimiterModule: AudioModule | null = null
  let micGain: GainNode | null = null
  let micGateGain: GainNode | null = null
  let micAnalyserNode: AnalyserNode | null = null
  let prevMicSpectrumMag: Float32Array | null = null
  let scratchMicTime = new Float32Array(ANALYSER_FFT_SIZE)
  let scratchMicDb = new Float32Array(ANALYSER_FFT_SIZE)
  let micSensitivity = 0.5
  let micGate = 0.25
  let micGateSmoothed = 1
  let lastMetricsTimeMs: number | null = null
  let inputMode: AudioInputMode = 'synth'

  function getCtx(): AudioContext | null {
    return getAudioContext()
  }

  function applyInputMode(): void {
    const ctx = getCtx()
    if (!ctx) return
    const now = ctx.currentTime
    const syn = inputMode === 'mic' ? 0 : inputMode === 'mix' ? 0.6 : 1
    const mic = inputMode === 'synth' ? 0 : inputMode === 'mix' ? 0.6 : 1
    synthGain?.gain.setValueAtTime(syn, now)
    micGain?.gain.setValueAtTime(mic, now)
  }

  function buildAndConnect(audioStack: AudioStackConfig | null | undefined): void {
    const ctx = getCtx()
    if (!ctx || !masterGain || !mixer || !synthGain) return

    for (const m of chain) m.dispose()
    chain = []

    if (synthModule) {
      synthModule.dispose()
      synthModule = null
    }

    const enabled = audioStack?.enabled === true
    if (enabled) {
      synthModule = createSynth(ctx, {})
      synthModule.getInput().connect(synthGain)
      synthGain.gain.value = 1
      synthGain.connect(mixer)
    } else {
      // Audio is optional in SSOT; when disabled, keep output silent.
      synthGain.gain.value = 0
    }

    const masterVol = enabled ? (audioStack?.master?.volume ?? 0.22) : 0
    masterGain.gain.value = masterVol

    if (!analyserNode) {
      analyserNode = ctx.createAnalyser()
      analyserNode.fftSize = ANALYSER_FFT_SIZE
      analyserNode.smoothingTimeConstant = 0.5
    }

    const newChain = enabled ? buildAudioChain(ctx, audioStack) : []
    chain = newChain
    if (newChain.length > 0) {
      connectAudioChain(mixer, newChain, analyserNode)
      analyserNode.connect(masterGain)
    } else {
      mixer.connect(analyserNode)
      analyserNode.connect(masterGain)
    }

    applyInputMode()
  }

  function setConditionAudio(audioStack: AudioStackConfig | null | undefined): void {
    const ctx = getCtx()
    if (!ctx || !masterGain) return

    if (switchTimeoutId) {
      clearTimeout(switchTimeoutId)
      switchTimeoutId = null
    }

    const rampSec = RAMP_MS / 1000
    rampGain(masterGain, 0, rampSec)

    const nextStack = audioStack
    switchTimeoutId = setTimeout(() => {
      switchTimeoutId = null
      buildAndConnect(nextStack)
      if (masterGain) {
        const targetVol = nextStack?.master?.volume ?? 0.22
        const now = getCtx()?.currentTime ?? 0
        masterGain.gain.setValueAtTime(0, now)
        masterGain.gain.linearRampToValueAtTime(targetVol, now + rampSec)
      }
    }, RAMP_MS)
  }

  function stopMic(): void {
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop())
      micStream = null
    }
    if (micSource) {
      try {
        micSource.disconnect()
      } catch {
        // already disconnected
      }
      micSource = null
    }
    if (micPreGain) {
      try {
        micPreGain.disconnect()
      } catch {
        // ignore
      }
      micPreGain = null
    }
    if (micLimiterModule) {
      micLimiterModule.dispose()
      micLimiterModule = null
    }
    if (micAnalyserNode) {
      try {
        micAnalyserNode.disconnect()
      } catch {
        // ignore
      }
      micAnalyserNode = null
    }
    if (micGateGain) {
      try {
        micGateGain.disconnect()
      } catch {
        // ignore
      }
      micGateGain = null
    }
    if (micGain) {
      try {
        micGain.disconnect()
      } catch {
        // ignore
      }
      micGain = null
    }
    prevMicSpectrumMag = null
    callbacks.onMicStatusChange?.('off')
  }

  async function requestMic(): Promise<void> {
    const ctx = getCtx()
    if (!ctx || !mixer) {
      callbacks.onMicStatusChange?.('error', 'Audio not ready')
      return
    }
    // If already active, stop existing mic path before re-requesting.
    if (micStream) stopMic()
    callbacks.onMicStatusChange?.('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStream = stream
      micSource = ctx.createMediaStreamSource(stream)
      micPreGain = ctx.createGain()
      // Initialize from current sensitivity setting.
      micPreGain.gain.value = 0.05 + 0.55 * clamp01(micSensitivity)
      micLimiterModule = createCompressor(ctx, {
        threshold: MIC_LIMITER_THRESHOLD,
        ratio: MIC_LIMITER_RATIO,
        attack: MIC_LIMITER_ATTACK,
        release: MIC_LIMITER_RELEASE,
      })
      micAnalyserNode = ctx.createAnalyser()
      micAnalyserNode.fftSize = ANALYSER_FFT_SIZE
      micAnalyserNode.smoothingTimeConstant = 0.5
      micGateGain = ctx.createGain()
      micGateGain.gain.value = 1
      micGain = ctx.createGain()
      micGain.gain.value = 0

      micSource.connect(micPreGain)
      micPreGain.connect(micLimiterModule.getInput())
      micLimiterModule.connect(micAnalyserNode)
      micAnalyserNode.connect(micGateGain)
      micGateGain.connect(micGain)
      micGain.connect(mixer)

      applyInputMode()
      callbacks.onMicStatusChange?.('on')
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      const status: MicStatus = isDenied ? 'denied' : 'error'
      const message = err instanceof Error ? err.message : String(err)
      callbacks.onMicStatusChange?.(status, message)
    }
  }

  async function init(): Promise<void> {
    const status = await startAudioContext()
    if (status !== 'on') return

    const ctx = getCtx()
    if (!ctx) return

    masterGain = ctx.createGain()
    masterGain.gain.value = initialAudioStack?.master?.volume ?? 0.22
    masterGain.connect(ctx.destination)

    mixer = ctx.createGain()
    mixer.gain.value = 1
    synthGain = ctx.createGain()
    synthGain.gain.value = 1

    buildAndConnect(initialAudioStack)
    unsubscribe = addAudioContextListener((s, err) => callbacks.onStatusChange?.(s, err))
  }

  init()

  return {
    setMasterVolume(value: number) {
      if (masterGain) {
        const v = Math.max(0, Math.min(1, value))
        masterGain.gain.setValueAtTime(v, getCtx()?.currentTime ?? 0)
      }
    },
    setConditionAudio,
    getRms(): number {
      if (!analyserNode) return 0
      const res = computeRms(analyserNode, scratchMainTime)
      scratchMainTime = res.scratch
      return res.rms
    },
    getMetrics(): AudioMetrics {
      if (!analyserNode) return { rms: 0, centroid: 0, flux: 0 }

      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const dt = lastMetricsTimeMs != null ? Math.max(0.001, (nowMs - lastMetricsTimeMs) / 1000) : 1 / 60
      lastMetricsTimeMs = nowMs

      const mainRms = computeRms(analyserNode, scratchMainTime)
      scratchMainTime = mainRms.scratch
      const main = computeSpectralFeatures(analyserNode, prevSpectrumMag, scratchMainDb)
      scratchMainDb = main.scratchDb
      prevSpectrumMag = main.nextPrev

      let micRms: number | undefined
      let micCentroid: number | undefined
      let micFlux: number | undefined
      let micLow: number | undefined
      let micMid: number | undefined
      let micHigh: number | undefined

      if (micAnalyserNode && micGateGain) {
        const micR = computeRms(micAnalyserNode, scratchMicTime)
        scratchMicTime = micR.scratch
        micRms = micR.rms
        const mic = computeSpectralFeatures(micAnalyserNode, prevMicSpectrumMag, scratchMicDb)
        scratchMicDb = mic.scratchDb
        prevMicSpectrumMag = mic.nextPrev
        micCentroid = mic.centroid
        micFlux = mic.flux
        micLow = mic.low
        micMid = mic.mid
        micHigh = mic.high

        // Soft noise gate: threshold is in RMS domain; keep conservative.
        const threshold = clamp01(micGate) * 0.08
        const knee = 0.02
        const raw = clamp01(((micRms ?? 0) - threshold) / knee)
        const target = raw * raw // softer near threshold
        micGateSmoothed = smoothStep(micGateSmoothed, target, dt, 0.04, 0.18)
        micGateGain.gain.setValueAtTime(clamp01(micGateSmoothed), analyserNode.context.currentTime)
      }

      return {
        rms: mainRms.rms,
        centroid: main.centroid,
        flux: main.flux,
        low: main.low,
        mid: main.mid,
        high: main.high,
        micRms,
        micCentroid,
        micFlux,
        micLow,
        micMid,
        micHigh,
      }
    },
    applyReactiveParams(overrides: Record<string, number>): void {
      if (!overrides || !chain.length) return
      // Key format: "audio.<chainIndex>.<param>"
      for (const [k, v] of Object.entries(overrides)) {
        if (!k.startsWith('audio.')) continue
        const parts = k.split('.')
        if (parts.length < 3) continue
        const idx = Number(parts[1])
        const param = parts.slice(2).join('.')
        const mod = chain[idx]
        if (!mod || !Number.isFinite(v)) continue
        mod.setParams({ [param]: v })
      }
    },
    requestMic() {
      void requestMic()
    },
    stopMic,
    setInputMode(mode: AudioInputMode) {
      inputMode = mode
      applyInputMode()
    },
    setMicSensitivity(value: number) {
      micSensitivity = clamp01(value)
      if (micPreGain) {
        // Conservative range, still protected by limiter.
        const g = 0.05 + 0.55 * micSensitivity
        micPreGain.gain.setValueAtTime(g, getCtx()?.currentTime ?? 0)
      }
    },
    setMicGate(value: number) {
      micGate = clamp01(value)
    },
    stop() {
      if (switchTimeoutId) {
        clearTimeout(switchTimeoutId)
        switchTimeoutId = null
      }
      stopMic()
      unsubscribe?.()
      unsubscribe = null
      for (const m of chain) m.dispose()
      chain = []
      synthModule?.dispose()
      synthModule = null
      analyserNode = null
      mixer = null
      synthGain = null
      masterGain = null
      closeAudioContext()
    },
  }
}
