import { clamp } from './paramUtils'

const FULL_CIRCLE = Math.PI * 2

export function advancePulsePhase(phase: number, delta: number, rateHz: number): number {
  return (phase + delta * rateHz * FULL_CIRCLE) % FULL_CIRCLE
}

export function smoothPulseValue(
  phase: number,
  current: number,
  delta: number,
  smoothing: number,
  tauScale: number,
  minTau: number,
  maxTau: number,
): number {
  const target = Math.sin(phase) * 0.5 + 0.5
  const tau = clamp((1 - smoothing) * tauScale, minTau, maxTau)
  const blend = 1 - Math.exp(-delta / tau)
  return current + (target - current) * blend
}
