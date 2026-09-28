import type { AudioModule, MicStatus } from './types'

export type MicLifecycleOptions = {
  fftSize: number
  getContext: () => AudioContext | null
  getMixer: () => GainNode | null
  isDisposed: () => boolean
  onStatusChange: (status: MicStatus, error?: string) => void
  onStopped: () => void
  sampleMicRms: (analyser: AnalyserNode) => number
  safeDisconnect: (node: AudioNode | null) => void
}

export type MicrophoneGraph = {
  stream: MediaStream | null
  source: MediaStreamAudioSourceNode | null
  preGain: GainNode | null
  limiter: AudioModule | null
  routingGain: GainNode | null
  gateGain: GainNode | null
  analyser: AnalyserNode | null
}

export function createEmptyMicrophoneGraph(): MicrophoneGraph {
  return {
    stream: null,
    source: null,
    preGain: null,
    limiter: null,
    routingGain: null,
    gateGain: null,
    analyser: null,
  }
}
