import { createCompressor } from './fx'
import type { AudioInputMode } from './types'
import { clamp01 } from '../../shared/numbers'
import type { MicrophoneGraph } from './micTypes'

const MIC_LIMITER = { threshold: -24, ratio: 8, attack: 0.003, release: 0.1 }

export function createMicrophoneGraph(
  context: AudioContext,
  mixer: GainNode,
  stream: MediaStream,
  fftSize: number,
  sensitivity: number,
): MicrophoneGraph {
  const source = context.createMediaStreamSource(stream)
  const preGain = context.createGain()
  preGain.gain.value = microphonePreGain(sensitivity)
  const limiter = createCompressor(context, MIC_LIMITER)
  const analyser = context.createAnalyser()
  analyser.fftSize = fftSize
  analyser.smoothingTimeConstant = 0.5
  const gateGain = context.createGain()
  gateGain.gain.value = 1
  const routingGain = context.createGain()
  routingGain.gain.value = 0
  source.connect(preGain)
  preGain.connect(limiter.getInput())
  limiter.connect(analyser)
  analyser.connect(gateGain)
  gateGain.connect(routingGain)
  routingGain.connect(mixer)
  return { stream, source, preGain, limiter, routingGain, gateGain, analyser }
}

export function setMicrophoneSensitivity(
  graph: MicrophoneGraph,
  sensitivity: number,
  now: number,
): void {
  graph.preGain?.gain.setValueAtTime(microphonePreGain(sensitivity), now)
}

export function applyMicrophoneRoutingGain(
  graph: MicrophoneGraph,
  mode: AudioInputMode,
  now: number,
): void {
  const value = mode === 'synth' ? 0 : mode === 'mix' ? 0.6 : 1
  graph.routingGain?.gain.cancelScheduledValues(now)
  graph.routingGain?.gain.setValueAtTime(value, now)
}

function microphonePreGain(sensitivity: number): number {
  // Speech at a laptop mic is ~0.03..0.1 RMS and used to land near -45 dBFS after the master gain.
  return 0.5 + 5 * clamp01(sensitivity)
}
