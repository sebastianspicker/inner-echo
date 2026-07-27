import type { AudioStackConfig } from '../../conditions/schema'
import type { AudioModule } from './types'
import { buildAudioChain, connectAudioChain } from './audioGraphBuilder'

export function configureOutputRouting(
  context: AudioContext,
  audioStack: AudioStackConfig,
  enabled: boolean,
  masterGain: GainNode,
  mixer: GainNode,
  analyser: AnalyserNode | null,
  fftSize: number,
): { analyser: AnalyserNode; chain: AudioModule[] } {
  setMasterVolume({ context, masterGain, stack: audioStack, enabled })
  const nextAnalyser = configureAnalyser(context, analyser, fftSize)
  const chain = enabled ? buildAudioChain(context, audioStack) : []
  connectOutputChain(mixer, chain, nextAnalyser, masterGain)
  return { analyser: nextAnalyser, chain }
}

function setMasterVolume(args: {
  context: AudioContext
  masterGain: GainNode
  stack: AudioStackConfig
  enabled: boolean
}): void {
  const { context, masterGain, stack, enabled } = args
  masterGain.gain.cancelScheduledValues(context.currentTime)
  masterGain.gain.setValueAtTime(enabled ? (stack.master?.volume ?? 0.22) : 0, context.currentTime)
}

function configureAnalyser(
  context: AudioContext,
  analyser: AnalyserNode | null,
  fftSize: number,
): AnalyserNode {
  const next = analyser ?? context.createAnalyser()
  next.fftSize = fftSize
  next.smoothingTimeConstant = 0.5
  return next
}

function connectOutputChain(
  mixer: GainNode,
  chain: AudioModule[],
  analyser: AnalyserNode,
  masterGain: GainNode,
): void {
  if (chain.length) connectAudioChain(mixer, chain, analyser)
  else mixer.connect(analyser)
  analyser.connect(masterGain)
}
