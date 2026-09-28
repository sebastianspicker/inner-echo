/**
 * Reactive parameter driver.
 *
 * This module is responsible for the "reactive" nature of the application.
 * It takes incoming live audio data (RMS amplitude) and maps it to specific video shader parameters.
 *
 * How it works:
 * 1. It reads the current experience profile (`profile.reactive.analyser_to_params`).
 * 2. It tracks stateful smoothing envelopes (attack/release) for each mapped parameter.
 * 3. The experience workspace loop calls `getVideoOverrides()` and `getAudioOverrides()` every
 *    frame (60fps), which returns the calculated, smoothed, and clamped parameter overrides.
 */

import type { Profile } from '../../domain/experience/schema'
import { getProfileEntryForBuiltIndex } from '../../domain/experience/videoStack'
import { IMPLEMENTED_VIDEO_NODES } from '../capabilities'
import { resolveAnalyserTarget, type ResolvedMapping } from './analyserToParamsResolver'
import { clamp, smoothStep } from '../../shared/numbers'
import { logger } from '../../platform/logger'

interface MappingState extends ResolvedMapping {
  baseValue: number
  smoothed: number
  kind: 'video' | 'audio'
}

function normalizeClampRange(range: [number, number] | undefined): { min: number; max: number } {
  const a = range?.[0]
  const b = range?.[1]
  if (typeof a !== 'number' || typeof b !== 'number') {
    return { min: 0, max: 1 }
  }
  return {
    min: Math.min(a, b),
    max: Math.max(a, b),
  }
}

function getResolvedBaseValue(
  resolved: { kind: 'video' | 'audio'; paramKey: string },
  profile: Profile,
  reducedMotion: boolean | undefined,
): number {
  if (resolved.kind === 'video') {
    const [builtIndexStr, paramName] = resolved.paramKey.split('.')
    const entry = getProfileEntryForBuiltIndex(profile, Number(builtIndexStr), {
      reducedMotion,
      supportedNodeIds: IMPLEMENTED_VIDEO_NODES,
    })
    const value = entry?.params?.[paramName]
    return typeof value === 'number' ? value : 0
  }
  const parts = resolved.paramKey.split('.')
  const value = profile.audio_stack?.chain?.[Number(parts[1])]?.params?.[parts.slice(2).join('.')]
  return typeof value === 'number' ? value : 0
}

function buildMappings(
  profile: Profile,
  options: { reducedMotion?: boolean } | undefined,
): MappingState[] {
  const mappings: MappingState[] = []
  for (const def of profile.reactive?.analyser_to_params ?? []) {
    if (def.source !== 'rms') continue
    const resolved = resolveAnalyserTarget(def.target, profile, options)
    if (!resolved) {
      logger.warn(
        '[reactive] analyser_to_params: target not found or invalid, skipping:',
        def.target,
      )
      continue
    }
    const clampRange = normalizeClampRange(def.clamp)
    const baseValue = getResolvedBaseValue(resolved, profile, options?.reducedMotion)
    mappings.push({
      kind: resolved.kind,
      paramKey: resolved.paramKey,
      scale: def.scale ?? 1,
      offset: def.offset ?? 0,
      attack: def.smoothing?.attack ?? 0.05,
      release: def.smoothing?.release ?? 0.2,
      clampMin: clampRange.min,
      clampMax: clampRange.max,
      baseValue,
      smoothed: clamp(baseValue, clampRange.min, clampRange.max),
    })
  }
  return mappings
}

/**
 * Initializes a reactive driver for an experience profile.
 *
 * The driver sets up all internal state (current values, target values, smoothing speeds)
 * for every parameter that the profile wants to react to audio RMS.
 *
 * @param profile The current active experience profile.
 * @param options Optional configuration (e.g., whether Reduced Motion is forcing temporal nodes off).
 * @returns An object containing `getVideoOverrides` and `getAudioOverrides` functions to be called per-frame.
 */
export function createReactiveDriver(
  profile: Profile,
  options?: { reducedMotion?: boolean },
): {
  getVideoOverrides(delta: number, rms: number): Record<string, number>
  getAudioOverrides(delta: number, rms: number): Record<string, number>
} {
  const list = profile.reactive?.analyser_to_params
  if (!list?.length) {
    return {
      getVideoOverrides: () => ({}),
      getAudioOverrides: () => ({}),
    }
  }

  const mappings = buildMappings(profile, options)

  let videoOut: Record<string, number> = {}
  let audioOut: Record<string, number> = {}

  function stepAll(
    delta: number,
    rms: number,
  ): { video: Record<string, number>; audio: Record<string, number> } {
    videoOut = {}
    audioOut = {}
    for (const m of mappings) {
      const reactiveValue = rms * m.scale + m.offset
      const raw = m.kind === 'video' ? m.baseValue + reactiveValue : reactiveValue
      const smoothed = smoothStep(m.smoothed, raw, delta, m.attack, m.release)
      m.smoothed = smoothed
      const v = clamp(smoothed, m.clampMin, m.clampMax)
      if (m.kind === 'audio') audioOut[m.paramKey] = v
      else videoOut[m.paramKey] = v
    }
    return { video: videoOut, audio: audioOut }
  }

  let lastStep: { video: Record<string, number>; audio: Record<string, number> } = {
    video: {},
    audio: {},
  }
  let frameSeq = 0
  let lastStepSeq = -1
  let audioConsumed = true

  return {
    getVideoOverrides(delta: number, rms: number) {
      frameSeq++
      lastStepSeq = frameSeq
      audioConsumed = false
      lastStep = stepAll(delta, rms)
      return { ...lastStep.video }
    },
    getAudioOverrides(delta: number, rms: number) {
      if (!audioConsumed && lastStepSeq === frameSeq) {
        audioConsumed = true
        return { ...lastStep.audio }
      }
      lastStep = stepAll(delta, rms)
      lastStepSeq = frameSeq
      return { ...lastStep.audio }
    },
  }
}
