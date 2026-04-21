/**
 * Audio Graph Builder
 *
 * This module is responsible for parsing a condition's profile (`audio_stack.chain`)
 * and transforming it into real Web Audio API nodes (`AudioModule`).
 *
 * Unknown node types in the configuration are safely skipped, and warnings are logged.
 */

import type { AudioModule } from './types'
import type { AudioStackConfig } from '../../conditions/schema'
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
import { logger } from '../../utils/logger'

const RAMP_DURATION = 0.02

type NodeFactory = (context: BaseAudioContext, params?: Record<string, unknown>) => AudioModule

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
  pulse_tone: (ctx, p) =>
    createPulseTone(ctx, p as { rate?: number; mix?: number; base_freq?: number }),
  compressor_limiter: (ctx, p) =>
    createCompressor(
      ctx,
      p as {
        threshold?: number
        ratio?: number
        attack?: number
        release?: number
        ceiling?: number
      },
    ),
}

/** Exported key list so the canonical IMPLEMENTED_AUDIO_NODES set can be derived in engine/nodeTypes.ts. */
export const AUDIO_NODE_TYPE_KEYS: readonly string[] = Object.keys(FX_FACTORY)

export function isKnownAudioNodeType(nodeType: string): boolean {
  // biome-ignore lint/suspicious/noPrototypeBuiltins: Object.hasOwn requires ES2022 lib
  return Object.prototype.hasOwnProperty.call(FX_FACTORY, String(nodeType).toLowerCase())
}

/**
 * Builds an array of `AudioModule`s based on the `audio_stack.chain` array defined in a profile.
 * It uses the factory map `FX_FACTORY` to instantiate the corresponding Web Audio nodes.
 *
 * @param context The active `BaseAudioContext`.
 * @param config The `AudioStackConfig` parsed from a JSON profile.
 * @returns An array of instantiated `AudioModule`s ready to be connected.
 */
export function buildAudioChain(
  context: BaseAudioContext,
  config: AudioStackConfig | null | undefined,
): AudioModule[] {
  const chain: AudioModule[] = []
  const list = config?.chain
  if (!list?.length) return chain

  for (const def of list) {
    const nodeType = def.node
    if (!nodeType || typeof nodeType !== 'string') {
      logger.warn('[audio] chain entry missing "node":', def)
      continue
    }
    const nodeKey = nodeType.toLowerCase()
    const factory = FX_FACTORY[nodeKey]
    if (!factory) {
      logger.warn('[audio] Unknown audio node type, skipping:', nodeType)
      continue
    }
    const params = def.params ?? {}
    chain.push(factory(context, params))
  }
  return chain
}

/**
 * Connects an array of instantiated `AudioModule`s sequentially in a daisy-chain setup.
 *
 * Signal flow: `source -> chain[0] -> chain[1] -> ... -> chain[n] -> destination`.
 *
 * @param source The starting node (e.g., a GainNode from a synthesizer or microphone).
 * @param chain The array of effect modules to apply.
 * @param destination The final output node (e.g., an AnalyserNode or the Context Destination).
 */
export function connectAudioChain(
  source: AudioNode,
  chain: AudioModule[],
  destination: AudioNode,
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
export function rampGain(
  gainNode: GainNode,
  value: number,
  duration: number = RAMP_DURATION,
): void {
  const now = gainNode.context.currentTime
  gainNode.gain.cancelScheduledValues(now)
  gainNode.gain.setValueAtTime(gainNode.gain.value, now)
  gainNode.gain.linearRampToValueAtTime(value, now + duration)
}
