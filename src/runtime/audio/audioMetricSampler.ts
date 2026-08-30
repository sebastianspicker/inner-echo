import type { AudioInputMode, AudioMetrics } from './types'
import { clamp01 } from '../../shared/numbers'
import { computeRms, computeSpectralFeatures, type F32 } from './analyserFeatures'

export type MicMetricNodes = {
  analyser: AnalyserNode | null
  gateGain: GainNode | null
  routingGain: GainNode | null
}

/** Keeps analyser buffers and spectral history private to one audio-engine instance. */
export function createAudioMetricSampler(fftSize: number) {
  let prevMainSpectrumMag: F32 | null = null
  let scratchMainTime: F32 = new Float32Array(fftSize)
  let scratchMainDb: F32 = new Float32Array(fftSize)
  let lastMainRms = 0
  let prevMicSpectrumMag: F32 | null = null
  let scratchMicTime: F32 = new Float32Array(fftSize)
  let scratchMicDb: F32 = new Float32Array(fftSize)

  const sampleMicRms = (analyser: AnalyserNode) => {
    const sample = computeRms(analyser, scratchMicTime)
    scratchMicTime = sample.scratch
    return sample.rms
  }

  return {
    getRms(analyser: AnalyserNode | null): number {
      if (!analyser) return 0
      const sample = computeRms(analyser, scratchMainTime)
      scratchMainTime = sample.scratch
      lastMainRms = sample.rms
      return lastMainRms
    },
    sampleMicRms,
    resetMicHistory() {
      prevMicSpectrumMag = null
    },
    getMetrics(
      analyser: AnalyserNode | null,
      micNodes: MicMetricNodes,
      inputMode: AudioInputMode,
    ): AudioMetrics {
      if (!analyser) return { rms: 0, centroid: 0, flux: 0 }

      const mainRms = computeRms(analyser, scratchMainTime)
      scratchMainTime = mainRms.scratch
      lastMainRms = mainRms.rms
      const main = computeSpectralFeatures(analyser, prevMainSpectrumMag, scratchMainDb)
      scratchMainDb = main.scratchDb
      prevMainSpectrumMag = main.nextPrev

      let micRms: number | undefined
      let micCentroid: number | undefined
      let micFlux: number | undefined
      let micLow: number | undefined
      let micMid: number | undefined
      let micHigh: number | undefined
      const { analyser: micAnalyser, gateGain, routingGain } = micNodes

      if (micAnalyser && gateGain && routingGain) {
        const routing = inputMode === 'synth' ? 0 : clamp01(routingGain.gain.value)
        const gate = clamp01(gateGain.gain.value)
        const effectiveMicGain = routing * gate
        const micR = computeRms(micAnalyser, scratchMicTime)
        scratchMicTime = micR.scratch
        const mic = computeSpectralFeatures(micAnalyser, prevMicSpectrumMag, scratchMicDb)
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
  }
}
