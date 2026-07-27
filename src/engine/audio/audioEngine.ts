/**
 * Audio Engine
 *
 * Owns all WebAudio resources: profile-driven synth/FX chains, analyser metrics
 * for reactive video, optional microphone input, and synth/mic/mix routing.
 * Callers must create it from a user gesture because browsers gate AudioContext
 * and microphone access.
 */

import {
  getAudioContext,
  startAudioContext,
  closeAudioContext,
  addAudioContextListener,
} from './contextManager'
import type {
  AudioContextStatus,
  MicStatus,
  AudioInputMode,
  AudioModule,
  AudioMetrics,
} from './types'
import type { AudioStackConfig } from '../../conditions/schema'
import { createSynth } from './synth'
import { createCompressor } from './fx'
import { isKnownAudioNodeType, rampGain } from './audioGraphBuilder'
import { clamp01, smoothStep } from '../../utils/numeric'
import { logger } from '../../utils/logger'
import { computeRms, computeSpectralFeatures, type F32 } from './analyserFeatures'
import { configureOutputRouting as configureOutput } from './outputRouting'
import { getAudioContextTime, getAudioStackTargetVolume } from './audioStackValues'

const RAMP_MS = 25
const ANALYSER_FFT_SIZE = 2048

/** Mic limiter settings: threshold (dB), ratio, attack, release. */
const MIC_LIMITER_THRESHOLD = -24
const MIC_LIMITER_RATIO = 8
const MIC_LIMITER_ATTACK = 0.003
const MIC_LIMITER_RELEASE = 0.1

const safeDisconnect = (node: AudioNode | null) => {
  if (!node) return
  try {
    node.disconnect()
  } catch {
    // already disconnected or not connected: safe to ignore
  }
}

export interface AudioEngineCallbacks {
  onStatusChange?(status: AudioContextStatus, error?: string): void
  /** Mic permission/source state. */
  onMicStatusChange?(status: MicStatus, error?: string): void
}

export interface AudioEngineDebugState {
  activeNodes: string[]
  inputMode: AudioInputMode
  micEnabled: boolean
  micSensitivity: number
  micGate: number
  micGateGain: number | null
}

export interface AudioEngineControl {
  /** Set master volume 0..1. */
  setMasterVolume(value: number): void
  /** Set condition audio stack (rebuilds chain with ramp). */
  setConditionAudio(audioStack: AudioStackConfig | null | undefined): void
  /** Current RMS (0..1-ish). Returns 0 if analyser not available. */
  getRms(): number
  /** Audio metrics for coupling (RMS + spectral features). */
  getMetrics(): AudioMetrics
  /** Apply "audio.<chainIndex>.<param>" overrides (smoothed/clamped upstream). */
  applyReactiveParams(overrides: Record<string, number>): void
  /** Request mic (call only after user gesture). */
  requestMic(): void
  /** Stop mic and release tracks. */
  stopMic(): void
  /** Set input routing: synth only, mic only, or mix. */
  setInputMode(mode: AudioInputMode): void
  /** Set mic sensitivity (0..1). Applied as conservative pre-gain into limiter. */
  setMicSensitivity(value: number): void
  /** Set soft noise gate threshold (0..1). Higher = stronger gating. */
  setMicGate(value: number): void
  /** Debug-only runtime snapshot (cheap and side-effect free). */
  getDebugState(): AudioEngineDebugState
  /** Suspend audio (e.g. Stop Everything). */
  stop(): void
}

/**
 * Creates and starts the main AudioEngine instance.
 *
 * Call this only after a user gesture, such as an Enable audio click event.
 * This function handles building the internal routing graph, connecting synthesizers,
 * microphones, and effect chains.
 *
 * @param initialAudioStack The configuration for the audio effects chain from the current condition profile.
 * @param callbacks Event listeners for when the audio or mic status changes.
 * @returns An `AudioEngineControl` object allowing the UI to interact with the running engine.
 */
export function createAudioEngine(
  initialAudioStack: AudioStackConfig | null | undefined,
  callbacks: AudioEngineCallbacks = {},
): AudioEngineControl {
  let masterGain: GainNode | null = null
  let analyserNode: AnalyserNode | null = null
  let mixer: GainNode | null = null
  let synthGain: GainNode | null = null
  let synthModule: ReturnType<typeof createSynth> | null = null
  let chain: AudioModule[] = []
  let unsubscribe: (() => void) | null = null
  let switchTimeoutId: ReturnType<typeof setTimeout> | null = null
  let prevSpectrumMag: F32 | null = null
  let scratchMainTime: F32 = new Float32Array(ANALYSER_FFT_SIZE)
  let scratchMainDb: F32 = new Float32Array(ANALYSER_FFT_SIZE)

  let lastMainRms = 0

  // Mic stream and nodes are allocated only while mic is on and released on Stop Everything.
  let micStream: MediaStream | null = null
  let micSource: MediaStreamAudioSourceNode | null = null
  let micPreGain: GainNode | null = null
  let micLimiterModule: AudioModule | null = null
  let micGain: GainNode | null = null
  let micGateGain: GainNode | null = null
  let micAnalyserNode: AnalyserNode | null = null
  let prevMicSpectrumMag: F32 | null = null
  let scratchMicTime: F32 = new Float32Array(ANALYSER_FFT_SIZE)
  let scratchMicDb: F32 = new Float32Array(ANALYSER_FFT_SIZE)
  let micSensitivity = 0.5
  let micGate = 0.25
  let micGateSmoothed = 1
  let micGateIntervalId: ReturnType<typeof setInterval> | null = null
  let lastMicGateTickMs: number | null = null
  let inputMode: AudioInputMode = 'synth'
  let activeChainNodes: string[] = []
  let disposed = false
  let micRequestSeq = 0
  let desiredAudioStack: AudioStackConfig | null | undefined = initialAudioStack

  const getCtx = () => {
    return getAudioContext()
  }

  const applyInputMode = () => {
    const ctx = getCtx()
    if (!ctx) return
    const now = ctx.currentTime
    const syn = inputMode === 'mic' ? 0 : inputMode === 'mix' ? 0.6 : 1
    const mic = inputMode === 'synth' ? 0 : inputMode === 'mix' ? 0.6 : 1
    synthGain?.gain.cancelScheduledValues(now)
    synthGain?.gain.setValueAtTime(syn, now)
    micGain?.gain.cancelScheduledValues(now)
    micGain?.gain.setValueAtTime(mic, now)
  }

  const applyMicGateEnvelope = (micRms: number, dtSec: number) => {
    if (!micGateGain) return
    const threshold = clamp01(micGate) * 0.08
    const knee = 0.02
    const raw = clamp01((micRms - threshold) / knee)
    const target = raw * raw // softer near threshold
    micGateSmoothed = smoothStep(micGateSmoothed, target, dtSec, 0.04, 0.18)
    micGateGain.gain.setValueAtTime(clamp01(micGateSmoothed), getCtx()?.currentTime ?? 0)
  }

  const stopMicGateLoop = () => {
    if (micGateIntervalId) {
      clearInterval(micGateIntervalId)
      micGateIntervalId = null
    }
    lastMicGateTickMs = null
  }

  const startMicGateLoop = () => {
    if (micGateIntervalId) return
    lastMicGateTickMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
    micGateIntervalId = setInterval(() => {
      if (disposed || !micAnalyserNode || !micGateGain) return
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const dtSec =
        lastMicGateTickMs != null ? Math.max(0.001, (nowMs - lastMicGateTickMs) / 1000) : 1 / 30
      lastMicGateTickMs = nowMs
      const micRes = computeRms(micAnalyserNode, scratchMicTime)
      scratchMicTime = micRes.scratch
      applyMicGateEnvelope(micRes.rms, dtSec)
    }, 50)
  }

  const resetAudioRouting = () => {
    // Disconnect previous routing before rebuilding to avoid stacked parallel connections.
    safeDisconnect(synthGain)
    safeDisconnect(mixer)
    safeDisconnect(analyserNode)

    for (const m of chain) m.dispose()
    chain = []

    if (synthModule) {
      synthModule.dispose()
      synthModule = null
    }
  }

  const configureSynthRouting = (
    ctx: AudioContext,
    audioStack: AudioStackConfig,
    enabled: boolean,
  ) => {
    if (!synthGain || !mixer) return
    activeChainNodes = enabled
      ? (audioStack?.chain ?? [])
          .map((def) => String(def.node ?? '').toLowerCase())
          .filter((nodeType) => isKnownAudioNodeType(nodeType))
      : []
    if (enabled) {
      synthModule = createSynth(ctx, {})
      synthModule.connect(synthGain)
      synthGain.gain.value = 1
      synthGain.connect(mixer)
    } else {
      // Audio is optional in profiles; when disabled, keep output silent.
      synthGain.gain.value = 0
    }
  }

  const configureOutputRouting = (
    ctx: AudioContext,
    audioStack: AudioStackConfig,
    enabled: boolean,
  ) => {
    if (!masterGain || !mixer) return
    const configured = configureOutput(
      ctx,
      audioStack,
      enabled,
      masterGain,
      mixer,
      analyserNode,
      ANALYSER_FFT_SIZE,
    )
    analyserNode = configured.analyser
    chain = configured.chain
  }

  const buildAndConnect = (audioStack: AudioStackConfig | null | undefined) => {
    const ctx = getCtx()
    if (!ctx) return
    if ([masterGain, mixer, synthGain].includes(null)) return
    resetAudioRouting()
    const enabled = audioStack?.enabled === true
    configureSynthRouting(ctx, audioStack ?? {}, enabled)
    configureOutputRouting(ctx, audioStack ?? {}, enabled)

    applyInputMode()
  }

  const finishConditionSwitch = (
    nextStack: AudioStackConfig | null | undefined,
    rampSec: number,
  ) => {
    if (disposed) return
    switchTimeoutId = null
    buildAndConnect(nextStack)
    const currentMaster = masterGain
    if (!currentMaster) return
    const targetVol = getAudioStackTargetVolume(nextStack)
    const now = getAudioContextTime(getCtx())
    currentMaster.gain.setValueAtTime(0, now)
    currentMaster.gain.linearRampToValueAtTime(targetVol, now + rampSec)
  }

  const setConditionAudio = (audioStack: AudioStackConfig | null | undefined) => {
    if (disposed) return
    desiredAudioStack = audioStack
    const ctx = getCtx()
    if (!ctx || !masterGain) return

    if (switchTimeoutId) {
      clearTimeout(switchTimeoutId)
      switchTimeoutId = null
    }

    const rampSec = RAMP_MS / 1000
    rampGain(masterGain, 0, rampSec)

    const nextStack = desiredAudioStack
    switchTimeoutId = setTimeout(() => finishConditionSwitch(nextStack, rampSec), RAMP_MS)
  }

  const stopMic = () => {
    micRequestSeq++
    stopMicGateLoop()
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop())
      micStream = null
    }
    safeDisconnect(micSource)
    micSource = null
    safeDisconnect(micPreGain)
    micPreGain = null
    micLimiterModule?.dispose()
    micLimiterModule = null
    safeDisconnect(micAnalyserNode)
    micAnalyserNode = null
    safeDisconnect(micGateGain)
    micGateGain = null
    safeDisconnect(micGain)
    micGain = null
    prevMicSpectrumMag = null
    micGateSmoothed = 1
    callbacks.onMicStatusChange?.('off')
  }

  const requestMic = async () => {
    if (disposed) return
    if (!getCtx() || !mixer) {
      callbacks.onMicStatusChange?.('error', 'Audio not ready')
      return
    }
    // If already active, stop existing mic path before re-requesting.
    // This also increments micRequestSeq so any in-flight prior request is discarded.
    if (micStream) stopMic()
    const requestSeq = ++micRequestSeq
    callbacks.onMicStatusChange?.('requesting')
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (disposed || requestSeq !== micRequestSeq) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const ctx = getCtx()
      if (!ctx || !mixer) {
        stream.getTracks().forEach((t) => t.stop())
        callbacks.onMicStatusChange?.('error', 'Audio not ready')
        return
      }
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
      startMicGateLoop()
      callbacks.onMicStatusChange?.('on')
    } catch (err) {
      if (stream && stream !== micStream) {
        stream.getTracks().forEach((t) => t.stop())
      }
      if (disposed || requestSeq !== micRequestSeq) return
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      const status: MicStatus = isDenied ? 'denied' : 'error'
      const message = err instanceof Error ? err.message : String(err)
      callbacks.onMicStatusChange?.(status, message)
    }
  }

  const init = async () => {
    const status = await startAudioContext()
    if (disposed) return
    if (status !== 'on') return

    const ctx = getCtx()
    if (!ctx) return

    masterGain = ctx.createGain()
    masterGain.gain.value = desiredAudioStack?.master?.volume ?? 0.22
    masterGain.connect(ctx.destination)

    mixer = ctx.createGain()
    mixer.gain.value = 1
    synthGain = ctx.createGain()
    synthGain.gain.value = 1

    buildAndConnect(desiredAudioStack)
    unsubscribe = addAudioContextListener((s, err) => callbacks.onStatusChange?.(s, err))
  }

  init().catch((err) => {
    callbacks.onStatusChange?.('error', err instanceof Error ? err.message : String(err))
  })

  return {
    setMasterVolume(value: number) {
      if (masterGain) {
        masterGain.gain.setValueAtTime(clamp01(value), getCtx()?.currentTime ?? 0)
      }
    },
    setConditionAudio,
    getRms(): number {
      if (!analyserNode) return 0
      const res = computeRms(analyserNode, scratchMainTime)
      scratchMainTime = res.scratch
      lastMainRms = res.rms
      return lastMainRms
    },
    getMetrics(): AudioMetrics {
      if (!analyserNode) return { rms: 0, centroid: 0, flux: 0 }

      const mainRms = computeRms(analyserNode, scratchMainTime)
      scratchMainTime = mainRms.scratch
      lastMainRms = mainRms.rms
      const main = computeSpectralFeatures(analyserNode, prevSpectrumMag, scratchMainDb)
      scratchMainDb = main.scratchDb
      prevSpectrumMag = main.nextPrev

      let micRms: number | undefined
      let micCentroid: number | undefined
      let micFlux: number | undefined
      let micLow: number | undefined
      let micMid: number | undefined
      let micHigh: number | undefined

      if (micAnalyserNode && micGateGain && micGain) {
        const routingGain = inputMode === 'synth' ? 0 : clamp01(micGain.gain.value)
        const gateGain = clamp01(micGateGain.gain.value)
        const effectiveMicGain = routingGain * gateGain
        const micR = computeRms(micAnalyserNode, scratchMicTime)
        scratchMicTime = micR.scratch
        const mic = computeSpectralFeatures(micAnalyserNode, prevMicSpectrumMag, scratchMicDb)
        scratchMicDb = mic.scratchDb
        prevMicSpectrumMag = mic.nextPrev
        if (effectiveMicGain > 0) {
          micRms = micR.rms * effectiveMicGain
          micCentroid = mic.centroid * effectiveMicGain
          micFlux = mic.flux * effectiveMicGain
          micLow = mic.low * effectiveMicGain
          micMid = mic.mid * effectiveMicGain
          micHigh = mic.high * effectiveMicGain
        }
      }

      return {
        rms: lastMainRms,
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
    getDebugState(): AudioEngineDebugState {
      const gate = micGateGain?.gain?.value
      return {
        activeNodes: activeChainNodes.slice(),
        inputMode,
        micEnabled: micStream != null,
        micSensitivity,
        micGate,
        micGateGain: typeof gate === 'number' && Number.isFinite(gate) ? gate : null,
      }
    },
    stop() {
      if (disposed) return
      disposed = true
      if (switchTimeoutId) {
        clearTimeout(switchTimeoutId)
        switchTimeoutId = null
      }
      stopMic()
      unsubscribe?.()
      unsubscribe = null
      for (const m of chain) m.dispose()
      chain = []
      activeChainNodes = []
      synthModule?.dispose()
      synthModule = null
      safeDisconnect(analyserNode)
      analyserNode = null
      safeDisconnect(mixer)
      mixer = null
      safeDisconnect(synthGain)
      synthGain = null
      safeDisconnect(masterGain)
      masterGain = null
      void closeAudioContext().catch((err) => {
        logger.warn('closeAudioContext failed', err)
      })
    },
  }
}
