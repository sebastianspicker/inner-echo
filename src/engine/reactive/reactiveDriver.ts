/**
 * Phase 8: Reactive driver — RMS → smoothed, scaled, clamped overrides for video params.
 * One stateful driver per profile; call update(delta, rms) each frame to get param overrides.
 */

import type { Profile, AnalyserToParamDef } from '../../conditions/schema'
import { getProfileEntryForBuiltIndex } from '../../conditions/graphBuilder'
import {
  resolveAnalyserTarget,
  type ResolvedMapping,
} from './analyserToParamsResolver'

interface MappingState extends ResolvedMapping {
  smoothed: number
  kind: 'video' | 'audio'
}

/**
 * Apply exponential smoothing: smoothed += (target - smoothed) * (1 - exp(-dt / tau)).
 */
function smoothStep(
  current: number,
  target: number,
  dt: number,
  attack: number,
  release: number
): number {
  const tau = target > current ? attack : release
  if (tau <= 0) return target
  const t = 1 - Math.exp(-dt / tau)
  return current + (target - current) * t
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Create a reactive driver from profile.reactive.analyser_to_params.
 * Invalid or unknown targets are skipped with a console warning.
 * Returns a function (delta, rms) => Record<paramKey, number> to merge into controlValues.
 */
export function createReactiveDriver(
  profile: Profile,
  options?: { reducedMotion?: boolean }
): {
  getVideoOverrides(delta: number, rms: number): Record<string, number>
  getAudioOverrides(delta: number, rms: number): Record<string, number>
} {
  const list = (profile as { reactive?: { analyser_to_params?: AnalyserToParamDef[] } })
    .reactive?.analyser_to_params
  if (!list?.length) {
    return {
      getVideoOverrides: () => ({}),
      getAudioOverrides: () => ({}),
    }
  }

  const mappings: MappingState[] = []

  for (const def of list) {
    if (def.source !== 'rms') continue
    const resolved = resolveAnalyserTarget(def.target, profile, options)
    if (!resolved) {
      console.warn(
        '[reactive] analyser_to_params: target not found or invalid, skipping:',
        def.target
      )
      continue
    }
    let baseValue = 0
    if (resolved.kind === 'video') {
      const [builtIndexStr, paramName] = resolved.paramKey.split('.')
      const builtIndex = Number(builtIndexStr)
      const entry = getProfileEntryForBuiltIndex(profile, builtIndex, { reducedMotion: options?.reducedMotion })
      const params = entry?.params as Record<string, unknown> | undefined
      baseValue = params && typeof params[paramName] === 'number' ? (params[paramName] as number) : 0
    } else if (resolved.kind === 'audio') {
      // For audio overrides, default to 0 unless profile declares a numeric param.
      const parts = resolved.paramKey.split('.')
      const chainIndex = Number(parts[1])
      const paramName = parts.slice(2).join('.')
      const chain = (profile as { audio_stack?: { chain?: Array<{ params?: Record<string, unknown> }> } })
        .audio_stack?.chain ?? []
      const params = chain[chainIndex]?.params
      baseValue = params && typeof params[paramName] === 'number' ? (params[paramName] as number) : 0
    }
    const [clampMin = 0, clampMax = 1] = def.clamp ?? [0, 1]
    const initialSmoothed = clamp(baseValue, clampMin, clampMax)
    mappings.push({
      kind: resolved.kind,
      paramKey: resolved.paramKey,
      scale: def.scale ?? 1,
      offset: def.offset ?? 0,
      attack: def.smoothing?.attack ?? 0.05,
      release: def.smoothing?.release ?? 0.2,
      clampMin,
      clampMax,
      smoothed: initialSmoothed,
    })
  }

  function stepAll(delta: number, rms: number): { video: Record<string, number>; audio: Record<string, number> } {
    const video: Record<string, number> = {}
    const audio: Record<string, number> = {}
    for (const m of mappings) {
      const raw = rms * m.scale + m.offset
      const smoothed = smoothStep(m.smoothed, raw, delta, m.attack, m.release)
      m.smoothed = smoothed
      const v = clamp(smoothed, m.clampMin, m.clampMax)
      if (m.kind === 'audio') audio[m.paramKey] = v
      else video[m.paramKey] = v
    }
    return { video, audio }
  }

  let lastStep: { video: Record<string, number>; audio: Record<string, number> } = { video: {}, audio: {} }
  let lastDelta = 0
  let lastRms = 0

  return {
    getVideoOverrides(delta: number, rms: number) {
      lastDelta = delta
      lastRms = rms
      lastStep = stepAll(delta, rms)
      return lastStep.video
    },
    getAudioOverrides(delta: number, rms: number) {
      // Keep in sync even if caller only asks audio overrides.
      if (delta !== lastDelta || rms !== lastRms) {
        lastDelta = delta
        lastRms = rms
        lastStep = stepAll(delta, rms)
      }
      return lastStep.audio
    },
  }
}
