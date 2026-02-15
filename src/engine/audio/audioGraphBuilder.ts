/**
 * Phase 7: Build audio FX chain from profile audio_stack.
 * Unknown node types are skipped with a warning.
 */

import type { AudioModule } from './types'
import type { AudioStackConfig, AudioStackNodeDef } from '../../conditions/schema'
import {
  createLowpass,
  createHighpass,
  createTremolo,
  createNoiseBed,
  createCompressor,
  createDelay,
  createReverb,
  createFlutter,
  createPulseTone,
} from './fx'

const RAMP_DURATION = 0.02

type NodeFactory = (
  context: BaseAudioContext,
  params?: Record<string, unknown>
) => AudioModule

const FX_FACTORY: Record<string, NodeFactory> = {
  lowpass: (ctx, p) => createLowpass(ctx, p as { cutoff?: number; q?: number }),
  highpass: (ctx, p) => createHighpass(ctx, p as { cutoff?: number; q?: number }),
  tremolo: (ctx, p) => createTremolo(ctx, p as { rate?: number; depth?: number }),
  flutter: (ctx, p) => createFlutter(ctx, p as { rate?: number; depth?: number }),
  noise_bed: (ctx, p) => {
    const params = p ?? {}
    return createNoiseBed(ctx, {
      level: params.level as number | undefined,
      color: params.color as 'white' | 'pink' | 'brown' | undefined,
    })
  },
  delay: (ctx, p) => createDelay(ctx, p as { time?: number; feedback?: number; mix?: number }),
  reverb: (ctx, p) => createReverb(ctx, p as { mix?: number; decay?: number }),
  pulse_tone: (ctx, p) => createPulseTone(ctx, p as { rate?: number; mix?: number; base_freq?: number }),
  compressor_limiter: (ctx, p) =>
    createCompressor(ctx, p as { threshold?: number; ratio?: number; attack?: number; release?: number; ceiling?: number }),
}

/**
 * Build an array of AudioModules from profile audio_stack.chain.
 * Only known node types are instantiated; others are skipped with a warning.
 */
export function buildAudioChain(
  context: BaseAudioContext,
  config: AudioStackConfig | null | undefined
): AudioModule[] {
  const chain: AudioModule[] = []
  const list = config?.chain
  if (!list?.length) return chain

  for (const def of list) {
    const nodeType = (def as AudioStackNodeDef).node
    if (!nodeType || typeof nodeType !== 'string') {
      console.warn('[audio] chain entry missing "node":', def)
      continue
    }
    const factory = FX_FACTORY[nodeType]
    if (!factory) {
      console.warn('[audio] Unknown audio node type, skipping:', nodeType)
      continue
    }
    const params = (def as AudioStackNodeDef).params ?? {}
    chain.push(factory(context, params))
  }
  return chain
}

/**
 * Connect source -> chain[0] -> ... -> chain[n] -> destination.
 */
export function connectAudioChain(
  source: AudioNode,
  chain: AudioModule[],
  destination: AudioNode
): void {
  if (chain.length === 0) {
    source.connect(destination)
    return
  }
  source.connect(chain[0].getInput())
  for (let i = 0; i < chain.length - 1; i++) {
    chain[i].connect(chain[i + 1].getInput())
  }
  chain[chain.length - 1].connect(destination)
}

/**
 * Apply a short ramp on a GainNode to avoid clicks (e.g. when switching condition).
 */
export function rampGain(gainNode: GainNode, value: number, duration: number = RAMP_DURATION): void {
  const now = gainNode.context.currentTime
  gainNode.gain.cancelScheduledValues(now)
  gainNode.gain.setValueAtTime(gainNode.gain.value, now)
  gainNode.gain.linearRampToValueAtTime(value, now + duration)
}
