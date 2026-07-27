import type { AudioModule } from '../types'
import { clamp } from '../../../utils/numeric'

export interface CompressorValues {
  threshold: number
  ratio: number
  attack: number
  release: number
  ceiling: number
}

export function createCompressorModule(
  context: BaseAudioContext,
  values: CompressorValues,
): AudioModule {
  const compressor = context.createDynamicsCompressor()
  compressor.threshold.value = clamp(values.threshold, -40, -10)
  compressor.ratio.value = clamp(values.ratio, 2, 12)
  compressor.attack.value = clamp(values.attack, 0.001, 0.05)
  compressor.release.value = clamp(values.release, 0.05, 0.6)
  const input = context.createGain()
  input.gain.value = 1
  input.connect(compressor)
  const ceilingGain = context.createGain()
  compressor.connect(ceilingGain)
  ceilingGain.gain.value = ceilingToGain(values.ceiling)
  return createModule({ context, compressor, input, ceilingGain })
}

interface CompressorNodes {
  context: BaseAudioContext
  compressor: DynamicsCompressorNode
  input: GainNode
  ceilingGain: GainNode
}

function createModule(nodes: CompressorNodes): AudioModule {
  const { input, ceilingGain } = nodes
  return {
    connect: (destination) => ceilingGain.connect(destination),
    getInput: () => input,
    setParams: (params) => setCompressorParams({ ...nodes, params }),
    dispose: () => disconnectCompressor(nodes),
  }
}

function setCompressorParams(nodes: CompressorNodes & { params: Record<string, unknown> }): void {
  const { context, compressor, ceilingGain, params } = nodes
  setNumericParam({
    param: compressor.threshold,
    value: params.threshold,
    min: -40,
    max: -10,
    context,
  })
  setNumericParam({ param: compressor.ratio, value: params.ratio, min: 2, max: 12, context })
  setNumericParam({
    param: compressor.attack,
    value: params.attack,
    min: 0.001,
    max: 0.05,
    context,
  })
  setNumericParam({
    param: compressor.release,
    value: params.release,
    min: 0.05,
    max: 0.6,
    context,
  })
  if (typeof params.ceiling === 'number')
    ceilingGain.gain.setValueAtTime(ceilingToGain(params.ceiling), context.currentTime)
}

function setNumericParam(args: {
  param: AudioParam
  value: unknown
  min: number
  max: number
  context: BaseAudioContext
}): void {
  const { param, value, min, max, context } = args
  if (typeof value === 'number') param.setValueAtTime(clamp(value, min, max), context.currentTime)
}

function ceilingToGain(value: number): number {
  return 10 ** (clamp(value, -24, -6) / 20)
}

function disconnectCompressor(nodes: CompressorNodes): void {
  const { input, compressor, ceilingGain } = nodes
  input.disconnect()
  compressor.disconnect()
  ceilingGain.disconnect()
}
