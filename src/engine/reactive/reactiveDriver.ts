/**
 * Reactive Driver Engine
 *
 * This module is responsible for the "reactive" nature of the application.
 * It takes incoming live audio data (RMS amplitude) and maps it to specific video shader parameters.
 *
 * How it works:
 * 1. It reads the current condition profile (`profile.reactive.analyser_to_params`).
 * 2. It tracks stateful smoothing envelopes (attack/release) for each mapped parameter.
 * 3. The main `CameraView` loop calls `getVideoOverrides()` and `getAudioOverrides()` every
 *    frame (60fps), which returns the calculated, smoothed, and clamped parameter overrides.
 */

import type { Profile } from '../../conditions/schema'
import { getProfileEntryForBuiltIndex } from '../../conditions/graphBuilder'
import { resolveAnalyserTarget, type ResolvedMapping } from './analyserToParamsResolver'
import { clamp, smoothStep } from '../../utils/numeric'
import { logger } from '../../utils/logger'

interface MappingState extends ResolvedMapping {
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

/**
 * Initializes a new reactive driver based on a given condition profile.
 *
 * The driver sets up all internal state (current values, target values, smoothing speeds)
 * for every parameter that the profile wants to react to audio RMS.
 *
 * @param profile The current active condition profile.
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

  const mappings: MappingState[] = []

  for (const def of list) {
    if (def.source !== 'rms') continue
    const resolved = resolveAnalyserTarget(def.target, profile, options)
    if (!resolved) {
      logger.warn(
        '[reactive] analyser_to_params: target not found or invalid, skipping:',
        def.target,
      )
      continue
    }
    let baseValue = 0
    if (resolved.kind === 'video') {
      const [builtIndexStr, paramName] = resolved.paramKey.split('.')
      const builtIndex = Number(builtIndexStr)
      const entry = getProfileEntryForBuiltIndex(profile, builtIndex, {
        reducedMotion: options?.reducedMotion,
      })
      const params = entry?.params
      baseValue =
        params && typeof params[paramName] === 'number' ? (params[paramName] as number) : 0
    } else if (resolved.kind === 'audio') {
      // For audio overrides, default to 0 unless profile declares a numeric param.
      const parts = resolved.paramKey.split('.')
      const chainIndex = Number(parts[1])
      const paramName = parts.slice(2).join('.')
      const chain = profile.audio_stack?.chain ?? []
      const params = chain[chainIndex]?.params
      baseValue =
        params && typeof params[paramName] === 'number' ? (params[paramName] as number) : 0
    }
    const clampRange = normalizeClampRange(def.clamp)
    const clampMin = clampRange.min
    const clampMax = clampRange.max
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

  let videoOut: Record<string, number> = {}
  let audioOut: Record<string, number> = {}

  function stepAll(
    delta: number,
    rms: number,
  ): { video: Record<string, number>; audio: Record<string, number> } {
    videoOut = {}
    audioOut = {}
    for (const m of mappings) {
      const raw = rms * m.scale + m.offset
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
