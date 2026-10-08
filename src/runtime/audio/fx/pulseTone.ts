/**
 * A quiet, bounded pulsing tone mixed into the chain.
 *
 * Params:
 * - rate (Hz): pulses per second (`sine`) or mean ticks per second (`tick`)
 * - mix (0..1, kept low): peak tone level
 * - base_freq (Hz)
 * - shape: `sine` (default) is a smooth swell; `tick` is a sparse, soft 6 ms attack / 150 ms
 *   decay tap at irregular intervals (0.7..1.3 of the mean), never a loud transient.
 */

import type { AudioModule } from '../types'
import { clamp } from '../../../shared/numbers'
import { createRoutedAudioModule } from './routedAudioModule'

export type PulseToneShape = 'sine' | 'tick'

export interface PulseToneParams {
  rate?: number
  mix?: number
  base_freq?: number
  shape?: PulseToneShape
}

const DEFAULT_RATE = 1.0
const DEFAULT_MIX = 0.06
const DEFAULT_FREQ = 120
const MAX_MIX = 0.12
const TICK_ATTACK_S = 0.006
const TICK_DECAY_TAU_S = 0.045

function normalizeShape(shape: unknown): PulseToneShape {
  return shape === 'tick' ? 'tick' : 'sine'
}

function resolveInitialParams(params: PulseToneParams): Required<PulseToneParams> {
  return {
    rate: clamp(params.rate ?? DEFAULT_RATE, 0.2, 3),
    mix: clamp(params.mix ?? DEFAULT_MIX, 0, MAX_MIX),
    base_freq: clamp(params.base_freq ?? DEFAULT_FREQ, 60, 220),
    shape: normalizeShape(params.shape),
  }
}

/** Irregular tick scheduler driving the tone gain directly; idle while the shape is `sine`. */
function createTickScheduler(context: BaseAudioContext, toneGain: GainNode) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let running: { rateHz: number; peak: number } | null = null
  const stop = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    running = null
  }
  const fire = (peak: number) => {
    const now = context.currentTime
    toneGain.gain.cancelScheduledValues(now)
    toneGain.gain.setValueAtTime(0, now)
    toneGain.gain.linearRampToValueAtTime(peak, now + TICK_ATTACK_S)
    toneGain.gain.setTargetAtTime(0, now + TICK_ATTACK_S, TICK_DECAY_TAU_S)
  }
  const schedule = (meanIntervalSeconds: number, peak: number, factor: number) => {
    stop()
    timer = setTimeout(
      () => {
        fire(peak)
        schedule(meanIntervalSeconds, peak, 0.7 + 0.6 * Math.random())
      },
      meanIntervalSeconds * factor * 1000,
    )
  }
  return {
    start(rateHz: number, peak: number): void {
      // Repeated setParams calls (every intensity change) must not keep postponing the next tick.
      if (running && running.rateHz === rateHz && running.peak === peak) return
      running = { rateHz, peak }
      schedule(1 / Math.max(0.2, rateHz), peak, 0.5)
    },
    stop,
  }
}

interface PulseToneNodes {
  input: GainNode
  out: GainNode
  osc: OscillatorNode
  toneGain: GainNode
  lfo: OscillatorNode
  lfoGain: GainNode
  offset: ConstantSourceNode
}

/** Pass-through plus a sine tone whose gain is driven by an LFO (sine shape) or the scheduler. */
function createPulseToneNodes(context: BaseAudioContext): PulseToneNodes {
  const input = context.createGain()
  input.gain.value = 1
  const out = context.createGain()
  out.gain.value = 1
  input.connect(out)

  const osc = context.createOscillator()
  osc.type = 'sine'
  const toneGain = context.createGain()
  toneGain.gain.value = 0

  const lfo = context.createOscillator()
  lfo.type = 'sine'
  const lfoGain = context.createGain()
  const offset = context.createConstantSource()

  lfo.connect(lfoGain)
  lfoGain.connect(toneGain.gain)
  offset.connect(toneGain.gain)
  offset.start(0)

  osc.connect(toneGain)
  toneGain.connect(out)
  osc.start(0)
  lfo.start(0)
  return { input, out, osc, toneGain, lfo, lfoGain, offset }
}

function disposePulseToneNodes(nodes: PulseToneNodes): void {
  try {
    nodes.osc.stop()
    nodes.lfo.stop()
    nodes.offset.stop()
  } catch {
    // ignore
  }
  for (const node of Object.values(nodes)) node.disconnect()
}

export function createPulseTone(
  context: BaseAudioContext,
  params: PulseToneParams = {},
): AudioModule {
  const initial = resolveInitialParams(params)
  let current = { ...initial }
  const nodes = createPulseToneNodes(context)
  const { osc, toneGain, lfo, lfoGain, offset } = nodes
  const ticks = createTickScheduler(context, toneGain)

  const set = (p: PulseToneParams) => {
    current = {
      rate: p.rate ?? current.rate,
      mix: p.mix ?? current.mix,
      base_freq: p.base_freq ?? current.base_freq,
      shape: p.shape === undefined ? current.shape : normalizeShape(p.shape),
    }
    const now = context.currentTime
    const rate = clamp(current.rate, 0.2, 3)
    const mix = clamp(current.mix, 0, MAX_MIX)
    osc.frequency.setValueAtTime(clamp(current.base_freq, 60, 220), now)
    lfo.frequency.setValueAtTime(rate, now)

    if (current.shape === 'tick') {
      // The LFO path is silenced; the scheduler owns the tone gain.
      lfoGain.gain.setValueAtTime(0, now)
      offset.offset.setValueAtTime(0, now)
      if (mix > 0) ticks.start(rate, mix)
      else ticks.stop()
      return
    }
    ticks.stop()
    toneGain.gain.cancelScheduledValues(now)
    toneGain.gain.setValueAtTime(0, now)
    // LFO maps [-1,1] -> [0,1] then scaled by mix.
    lfoGain.gain.setValueAtTime(0.5 * mix, now)
    offset.offset.setValueAtTime(0.5 * mix, now)
  }

  set(params)

  return createRoutedAudioModule({
    input: nodes.input,
    output: nodes.out,
    setParams(p: Record<string, unknown>): void {
      set({
        rate: p.rate as number | undefined,
        mix: p.mix as number | undefined,
        base_freq: p.base_freq as number | undefined,
        shape: p.shape as PulseToneShape | undefined,
      })
    },
    resetParams(): void {
      current = { ...initial }
      set(initial)
    },
    dispose(): void {
      ticks.stop()
      disposePulseToneNodes(nodes)
    },
  })
}
