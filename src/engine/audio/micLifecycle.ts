import { createCompressor } from './fx'
import type { AudioInputMode, AudioModule, MicStatus } from './types'
import { clamp01, smoothStep } from '../../utils/numeric'
import type { MicMetricNodes } from './audioMetricSampler'

export type MicLifecycleDebugState = {
  micEnabled: boolean
  micSensitivity: number
  micGate: number
  micGateGain: number | null
}

type MicLifecycleOptions = {
  fftSize: number
  getContext: () => AudioContext | null
  getMixer: () => GainNode | null
  isDisposed: () => boolean
  onStatusChange: (status: MicStatus, error?: string) => void
  onStopped: () => void
  sampleMicRms: (analyser: AnalyserNode) => number
  safeDisconnect: (node: AudioNode | null) => void
}

const MIC_LIMITER = { threshold: -24, ratio: 8, attack: 0.003, release: 0.1 }

/** Owns the optional microphone's permission request, resources, gate, and routing gain. */
export function createMicLifecycleController(options: MicLifecycleOptions) {
  let stream: MediaStream | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let preGain: GainNode | null = null
  let limiter: AudioModule | null = null
  let routingGain: GainNode | null = null
  let gateGain: GainNode | null = null
  let analyser: AnalyserNode | null = null
  let sensitivity = 0.5
  let gate = 0.25
  let gateSmoothed = 1
  let gateIntervalId: ReturnType<typeof setInterval> | null = null
  let lastGateTickMs: number | null = null
  let requestSeq = 0

  const stopGateLoop = () => {
    if (gateIntervalId) {
      clearInterval(gateIntervalId)
      gateIntervalId = null
    }
    lastGateTickMs = null
  }

  const applyGateEnvelope = (micRms: number, deltaSec: number) => {
    if (!gateGain) return
    const threshold = clamp01(gate) * 0.08
    const raw = clamp01((micRms - threshold) / 0.02)
    const target = raw * raw
    gateSmoothed = smoothStep(gateSmoothed, target, deltaSec, 0.04, 0.18)
    gateGain.gain.setValueAtTime(clamp01(gateSmoothed), options.getContext()?.currentTime ?? 0)
  }

  const startGateLoop = () => {
    if (gateIntervalId) return
    lastGateTickMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
    gateIntervalId = setInterval(() => {
      if (options.isDisposed() || !analyser || !gateGain) return
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const deltaSec =
        lastGateTickMs != null ? Math.max(0.001, (nowMs - lastGateTickMs) / 1000) : 1 / 30
      lastGateTickMs = nowMs
      applyGateEnvelope(options.sampleMicRms(analyser), deltaSec)
    }, 50)
  }

  const stopMic = () => {
    requestSeq++
    stopGateLoop()
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      stream = null
    }
    options.safeDisconnect(source)
    source = null
    options.safeDisconnect(preGain)
    preGain = null
    limiter?.dispose()
    limiter = null
    options.safeDisconnect(analyser)
    analyser = null
    options.safeDisconnect(gateGain)
    gateGain = null
    options.safeDisconnect(routingGain)
    routingGain = null
    gateSmoothed = 1
    options.onStopped()
    options.onStatusChange('off')
  }

  const applyRoutingGain = (mode: AudioInputMode, now: number) => {
    const value = mode === 'synth' ? 0 : mode === 'mix' ? 0.6 : 1
    routingGain?.gain.cancelScheduledValues(now)
    routingGain?.gain.setValueAtTime(value, now)
  }

  const requestMic = async (applyInputMode: () => void) => {
    if (options.isDisposed()) return
    if (!options.getContext() || !options.getMixer()) {
      options.onStatusChange('error', 'Audio not ready')
      return
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      options.onStatusChange('error', 'Microphone access is not supported in this browser.')
      return
    }
    if (stream) stopMic()
    const activeRequest = ++requestSeq
    options.onStatusChange('requesting')
    let requestedStream: MediaStream | null = null
    try {
      requestedStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (options.isDisposed() || activeRequest !== requestSeq) {
        requestedStream.getTracks().forEach((track) => track.stop())
        return
      }
      const context = options.getContext()
      const mixer = options.getMixer()
      if (!context || !mixer) {
        requestedStream.getTracks().forEach((track) => track.stop())
        options.onStatusChange('error', 'Audio not ready')
        return
      }
      stream = requestedStream
      source = context.createMediaStreamSource(requestedStream)
      preGain = context.createGain()
      preGain.gain.value = 0.05 + 0.55 * clamp01(sensitivity)
      limiter = createCompressor(context, MIC_LIMITER)
      analyser = context.createAnalyser()
      analyser.fftSize = options.fftSize
      analyser.smoothingTimeConstant = 0.5
      gateGain = context.createGain()
      gateGain.gain.value = 1
      routingGain = context.createGain()
      routingGain.gain.value = 0

      source.connect(preGain)
      preGain.connect(limiter.getInput())
      limiter.connect(analyser)
      analyser.connect(gateGain)
      gateGain.connect(routingGain)
      routingGain.connect(mixer)

      applyInputMode()
      startGateLoop()
      options.onStatusChange('on')
    } catch (error) {
      if (requestedStream && requestedStream !== stream) {
        requestedStream.getTracks().forEach((track) => track.stop())
      }
      if (options.isDisposed() || activeRequest !== requestSeq) return
      const isDenied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
      options.onStatusChange(
        isDenied ? 'denied' : 'error',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  return {
    requestMic,
    stopMic,
    applyRoutingGain,
    setSensitivity(value: number) {
      sensitivity = clamp01(value)
      if (preGain)
        preGain.gain.setValueAtTime(
          0.05 + 0.55 * sensitivity,
          options.getContext()?.currentTime ?? 0,
        )
    },
    setGate(value: number) {
      gate = clamp01(value)
    },
    getMetricNodes(): MicMetricNodes {
      return { analyser, gateGain, routingGain }
    },
    getDebugState(): MicLifecycleDebugState {
      const gain = gateGain?.gain?.value
      return {
        micEnabled: stream != null,
        micSensitivity: sensitivity,
        micGate: gate,
        micGateGain: typeof gain === 'number' && Number.isFinite(gain) ? gain : null,
      }
    },
  }
}
