/**
 * Safety derivation and param clamping for composition.
 * Safe-Mode-Clamps, intensity_max, reduced_motion_policy, and runtime clamps for video/audio params.
 */

import type { Profile, VideoStackNodeDef, AudioStackConfig } from '../conditions/schema'
import type { ComposerSettings } from './types'
import { clamp01 } from './types'
import {
  mergeSafeModeClamps,
  mergeWarnings,
  mergeDisableNodes,
  normalizeNodeType,
} from './composeBlend'

export function clampAudioParams(
  config: AudioStackConfig,
  settings: ComposerSettings,
  safeModeClamps: Record<string, unknown>
): AudioStackConfig {
  const maxNoise = typeof safeModeClamps.max_noise_level === 'number' ? safeModeClamps.max_noise_level : 0.08
  const maxTremoloRate = typeof safeModeClamps.max_tremolo_rate_hz === 'number' ? safeModeClamps.max_tremolo_rate_hz : 4
  const maxTremoloDepth = typeof safeModeClamps.max_tremolo_depth === 'number' ? safeModeClamps.max_tremolo_depth : 0.15
  const hardMaxFeedback = clamp01(settings.maxFeedback)

  const chain = (config.chain ?? []).map((n) => {
    const node = normalizeNodeType(n.node)
    const params = { ...(n.params ?? {}) }
    if (node === 'noise_bed' && typeof params.level === 'number') {
      params.level = Math.max(0, Math.min(maxNoise, params.level))
    }
    if (node === 'tremolo') {
      if (typeof params.rate === 'number') params.rate = Math.max(0, Math.min(maxTremoloRate, params.rate))
      if (typeof params.depth === 'number') params.depth = Math.max(0, Math.min(maxTremoloDepth, params.depth))
    }
    if (node === 'delay' && typeof params.feedback === 'number') {
      params.feedback = Math.max(0, Math.min(0.18 * hardMaxFeedback, params.feedback))
    }
    return { ...n, node, params }
  })
  return { ...config, chain }
}

export function clampVideoParams(
  stack: VideoStackNodeDef[],
  settings: ComposerSettings,
  safeModeClamps: Record<string, unknown>
): VideoStackNodeDef[] {
  const maxFeedback = typeof safeModeClamps.max_feedback === 'number' ? safeModeClamps.max_feedback : 0.18
  const maxJitter = typeof safeModeClamps.max_jitter === 'number' ? safeModeClamps.max_jitter : 0.06
  const maxPulseDepth = typeof safeModeClamps.max_pulse_depth === 'number' ? safeModeClamps.max_pulse_depth : 0.18
  const maxChroma = typeof safeModeClamps.max_chroma === 'number' ? safeModeClamps.max_chroma : 0.12

  const hardMaxFeedback = clamp01(settings.maxFeedback)
  const hard = (x: number, max: number) => Math.max(0, Math.min(max * hardMaxFeedback, x))

  return stack.map((def) => {
    const node = normalizeNodeType(def.node)
    const params: Record<string, unknown> = { ...(def.params ?? {}) }
    if (node === 'temporal_smear' && typeof params.feedback === 'number') {
      params.feedback = hard(params.feedback, maxFeedback)
    }
    if (node === 'feedback_loop' && typeof params.feedback === 'number') {
      params.feedback = hard(params.feedback, maxFeedback)
    }
    if (node === 'focus_jitter' && typeof params.amount === 'number') {
      params.amount = hard(params.amount, maxJitter)
    }
    if (node === 'pulse' && typeof params.depth === 'number') {
      params.depth = hard(params.depth, maxPulseDepth)
    }
    if ((node === 'chroma_aberration' || node === 'chromatic_aberration') && typeof params.amount === 'number') {
      params.amount = hard(params.amount, maxChroma)
    }
    for (const k of Object.keys(params)) {
      const v = params[k]
      if (
        typeof v === 'number' &&
        k !== 'rate' &&
        k !== 'cutoff' &&
        k !== 'burst_duration_ms' &&
        k !== 'burst_min_gap_ms'
      ) {
        params[k] = Math.max(-1, Math.min(1, v))
      }
    }
    return { ...def, node, params }
  })
}

export type DimensionSafetyEntry = {
  safety?: {
    warnings?: string[]
    clamps?: Record<string, unknown>
    reduced_motion?: { disable_nodes?: string[] }
  }
}

export type DerivedSafety = {
  mergedSafeModeClamps: Record<string, unknown>
  mergedWarnings: string[]
  mergedDisableNodes: string[]
  intensityDefaultByPresets: number
  intensityMaxByPresets: number
  composedSafety: Profile['safety']
}

/**
 * Derive composed safety from preset safety blocks and dimension safety entries.
 */
export function deriveComposedSafety(
  safetyBlocks: Array<Profile['safety']>,
  cleanedDims: Array<{ dimensionId: string; weight: number }>,
  getDimensionSafety: (dimensionId: string) => DimensionSafetyEntry | null
): DerivedSafety {
  const safeModeClampsList: Array<Record<string, unknown> | undefined> = safetyBlocks.map(
    (s) => s.safe_mode_clamps as Record<string, unknown>
  )
  const reducedMotionDisableLists: Array<string[] | undefined> = safetyBlocks.map(
    (s) => s.reduced_motion_policy?.disable_nodes
  )
  const warningsLists: string[][] = safetyBlocks.map((s) => s.warnings ?? [])

  for (const d of cleanedDims) {
    const entry = getDimensionSafety(d.dimensionId)
    const dimSafety = entry?.safety
    if (dimSafety?.warnings?.length) warningsLists.push(dimSafety.warnings)
    if (dimSafety?.clamps) safeModeClampsList.push(dimSafety.clamps)
    if (dimSafety?.reduced_motion?.disable_nodes?.length) {
      reducedMotionDisableLists.push(dimSafety.reduced_motion.disable_nodes)
    }
  }

  const mergedSafeModeClamps = mergeSafeModeClamps(safeModeClampsList)
  const mergedWarnings = mergeWarnings(warningsLists)
  const mergedDisableNodes = mergeDisableNodes(reducedMotionDisableLists)

  const intensityMaxByPresets = safetyBlocks
    .map((s) => (typeof s.intensity_max === 'number' ? s.intensity_max : 1))
    .reduce((a, b) => Math.min(a, b), 1)
  const intensityDefaultByPresets = safetyBlocks
    .map((s) => (typeof s.intensity_default === 'number' ? s.intensity_default : 0.3))
    .reduce((a, b) => Math.min(a, b), 0.3)

  const composedSafety: Profile['safety'] = {
    intensity_default: intensityDefaultByPresets,
    intensity_max: intensityMaxByPresets,
    warnings: mergedWarnings,
    safe_mode_clamps: mergedSafeModeClamps,
    reduced_motion_policy: {
      disable_nodes: mergedDisableNodes,
      note: 'Composed policy: union of selected presets and dimensions (conservative).',
    },
  }

  return {
    mergedSafeModeClamps,
    mergedWarnings,
    mergedDisableNodes,
    intensityDefaultByPresets,
    intensityMaxByPresets,
    composedSafety,
  }
}
