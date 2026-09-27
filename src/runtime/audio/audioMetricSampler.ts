import type { AudioInputMode, AudioMetrics } from './types'
import { clamp01 } from '../../shared/numbers'
import { computeRms, computeSpectralFeatures, type F32 } from './analyserFeatures'

export type MicMetricNodes = {
  analyser: AnalyserNode | null
  gateGain: GainNode | null
  routingGain: GainNode | null
}

interface SpectrumHistory {
  previous: F32 | null
  scratchTime: F32
  scratchDb: F32
}

type OptionalMicMetrics = Pick<
  AudioMetrics,
  'micRms' | 'micCentroid' | 'micFlux' | 'micLow' | 'micMid' | 'micHigh'
>

function createSpectrumHistory(fftSize: number): SpectrumHistory {
  return {
    previous: null,
    scratchTime: new Float32Array(fftSize),
    scratchDb: new Float32Array(fftSize),
  }
}

function sampleAnalyser(analyser: AnalyserNode, history: SpectrumHistory) {
  const rms = computeRms(analyser, history.scratchTime)
  history.scratchTime = rms.scratch
  const spectral = computeSpectralFeatures(analyser, history.previous, history.scratchDb)
  history.scratchDb = spectral.scratchDb
  history.previous = spectral.nextPrev
  return { rms: rms.rms, ...spectral }
}

function sampleMicMetrics(
  micNodes: MicMetricNodes,
  inputMode: AudioInputMode,
  history: SpectrumHistory,
): OptionalMicMetrics {
  const { analyser, gateGain, routingGain } = micNodes
  if (!analyser || !gateGain || !routingGain) {
    history.previous = null
    return {}
  }
  const routing = inputMode === 'synth' ? 0 : clamp01(routingGain.gain.value)
  const effectiveGain = routing * clamp01(gateGain.gain.value)
  if (effectiveGain <= 0) {
    history.previous = null
    return {}
  }
  const hasSpectralHistory = history.previous?.length === analyser.frequencyBinCount
  const sample = sampleAnalyser(analyser, history)
  return {
    micRms: sample.rms * effectiveGain,
    micCentroid: sample.centroid * effectiveGain,
    micFlux: (hasSpectralHistory ? sample.flux : 0) * effectiveGain,
    micLow: sample.low * effectiveGain,
    micMid: sample.mid * effectiveGain,
    micHigh: sample.high * effectiveGain,
  }
}

/** Keeps analyser buffers and spectral history private to one audio-engine instance. */
export function createAudioMetricSampler(fftSize: number) {
  const mainHistory = createSpectrumHistory(fftSize)
  const micHistory = createSpectrumHistory(fftSize)
  let lastMainRms = 0

  const sampleMicRms = (analyser: AnalyserNode) => {
    const sample = computeRms(analyser, micHistory.scratchTime)
    micHistory.scratchTime = sample.scratch
    return sample.rms
  }

  return {
    getRms(analyser: AnalyserNode | null): number {
      if (!analyser) return 0
      const sample = computeRms(analyser, mainHistory.scratchTime)
      mainHistory.scratchTime = sample.scratch
      lastMainRms = sample.rms
      return lastMainRms
    },
    sampleMicRms,
    resetMicHistory() {
      micHistory.previous = null
    },
    resetMetricHistory() {
      mainHistory.previous = null
      micHistory.previous = null
    },
    getMetrics(
      analyser: AnalyserNode | null,
      micNodes: MicMetricNodes,
      inputMode: AudioInputMode,
    ): AudioMetrics {
      if (!analyser) return { rms: 0, centroid: 0, flux: 0 }

      const hasSpectralHistory = mainHistory.previous?.length === analyser.frequencyBinCount
      const main = sampleAnalyser(analyser, mainHistory)
      lastMainRms = main.rms

      return {
        rms: lastMainRms,
        centroid: main.centroid,
        flux: hasSpectralHistory ? main.flux : 0,
        low: main.low,
        mid: main.mid,
        high: main.high,
        ...sampleMicMetrics(micNodes, inputMode, micHistory),
      }
    },
  }
}
