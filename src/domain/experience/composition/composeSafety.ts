/**
 * Safety derivation and param clamping for composition.
 * Safe-Mode-Clamps, intensity_max, reduced_motion_policy, and runtime clamps for video/audio params.
 */

import type { Profile, VideoStackNodeDef, AudioStackConfig } from '../schema'
import { clamp01, type ComposerSettings } from './types'
import { clamp } from '../../../shared/numbers'
import {
  mergeSafeModeClamps,
  mergeWarnings,
  mergeDisableNodes,
  normalizeNodeType,
} from './composeBlend'

const VIDEO_HARD_CLAMP_PARAMS: Record<string, Record<string, string>> = {
  temporal_smear: { feedback: 'maxFeedback' },
  feedback_loop: { feedback: 'maxFeedback' },
  focus_jitter: { amount: 'maxJitter' },
  pulse: { depth: 'maxPulseDepth' },
  chroma_aberration: { amount: 'maxChroma' },
}

const VIDEO_DIRECT_CLAMP_PARAMS: Record<string, Record<string, string>> = {
  temporal_smear: { jitter: 'maxJitter' },
  feedback_loop: { jitter: 'maxJitter' },
}

const GENERIC_VIDEO_PARAM_EXCLUSIONS = new Set([
  'rate',
  'cutoff',
  'burst_duration_ms',
  'burst_min_gap_ms',
  'scale',
  'decay',
  'jitter',
])

export function clampAudioParams(
  config: AudioStackConfig,
  settings: ComposerSettings,
  safeModeClamps: Record<string, unknown>,
): AudioStackConfig {
  const maxNoise =
    typeof safeModeClamps.max_noise_level === 'number' ? safeModeClamps.max_noise_level : 0.08
  const maxTremoloRate =
    typeof safeModeClamps.max_tremolo_rate_hz === 'number' ? safeModeClamps.max_tremolo_rate_hz : 4
  const maxTremoloDepth =
    typeof safeModeClamps.max_tremolo_depth === 'number' ? safeModeClamps.max_tremolo_depth : 0.15
  const hardMaxFeedback = clamp01(settings.maxFeedback)

  const limits = { maxNoise, maxTremoloRate, maxTremoloDepth, hardMaxFeedback }
  const chain = (config.chain ?? []).map((node) => clampAudioNode(node, limits))
  return { ...config, chain }
}

function clampAudioNode(
  definition: NonNullable<AudioStackConfig['chain']>[number],
  limits: {
    maxNoise: number
    maxTremoloRate: number
    maxTremoloDepth: number
    hardMaxFeedback: number
  },
) {
  const node = normalizeNodeType(definition.node)
  const params = { ...(definition.params ?? {}) }
  clampAudioNodeValues(node, params, limits)
  return { ...definition, node, params }
}

function clampAudioNodeValues(
  node: string,
  params: Record<string, unknown>,
  limits: {
    maxNoise: number
    maxTremoloRate: number
    maxTremoloDepth: number
    hardMaxFeedback: number
  },
): void {
  if (node === 'noise_bed' && typeof params.level === 'number')
    params.level = clamp(params.level, 0, limits.maxNoise)
  if (node === 'tremolo') clampTremoloParams(params, limits)
  if (node === 'delay' && typeof params.feedback === 'number')
    params.feedback = clamp(params.feedback, 0, 0.18 * limits.hardMaxFeedback)
}

function clampTremoloParams(
  params: Record<string, unknown>,
  limits: { maxTremoloRate: number; maxTremoloDepth: number },
): void {
  if (typeof params.rate === 'number') params.rate = clamp(params.rate, 0, limits.maxTremoloRate)
  if (typeof params.depth === 'number')
    params.depth = clamp(params.depth, 0, limits.maxTremoloDepth)
}

export function clampVideoParams(
  stack: VideoStackNodeDef[],
  settings: ComposerSettings,
  safeModeClamps: Record<string, unknown>,
): VideoStackNodeDef[] {
  const maxFeedback =
    typeof safeModeClamps.max_feedback === 'number' ? safeModeClamps.max_feedback : 0.18
  const maxJitter = typeof safeModeClamps.max_jitter === 'number' ? safeModeClamps.max_jitter : 0.06
  const maxPulseDepth =
    typeof safeModeClamps.max_pulse_depth === 'number' ? safeModeClamps.max_pulse_depth : 0.18
  const maxChroma = typeof safeModeClamps.max_chroma === 'number' ? safeModeClamps.max_chroma : 0.12

  const hardMaxFeedback = clamp01(settings.maxFeedback)
  const hard = (x: number, max: number) => clamp(x, 0, max * hardMaxFeedback)

  const clampLimits = { maxFeedback, maxJitter, maxPulseDepth, maxChroma }

  const clampParam = (node: string, key: string, value: number): number => {
    const hardLimitKey = VIDEO_HARD_CLAMP_PARAMS[node]?.[key]
    if (hardLimitKey) return hard(value, clampLimits[hardLimitKey as keyof typeof clampLimits])
    const directLimitKey = VIDEO_DIRECT_CLAMP_PARAMS[node]?.[key]
    if (directLimitKey)
      return clamp(value, 0, clampLimits[directLimitKey as keyof typeof clampLimits])
    return GENERIC_VIDEO_PARAM_EXCLUSIONS.has(key) ? value : clamp(value, -1, 1)
  }

  return stack.map((def) => {
    const node = normalizeNodeType(def.node)
    const params: Record<string, unknown> = { ...(def.params ?? {}) }
    for (const k of Object.keys(params)) {
      const v = params[k]
      if (typeof v !== 'number') continue
      params[k] = clampParam(node, k, v)
    }
    return { ...def, node, params }
  })
}

type DimensionSafetyEntry = {
  safety?: {
    warnings?: string[]
    clamps?: Record<string, unknown>
    reduced_motion?: { disable_nodes?: string[] }
  }
}

type DerivedSafety = {
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
  getDimensionSafety: (dimensionId: string) => DimensionSafetyEntry | null,
): DerivedSafety {
  const safeModeClampsList: Array<Record<string, unknown> | undefined> = safetyBlocks.map(
    (s) => s.safe_mode_clamps,
  )
  const reducedMotionDisableLists: Array<string[] | undefined> = safetyBlocks.map(
    (s) => s.reduced_motion_policy?.disable_nodes,
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

  const intensityMaxByPresets =
    safetyBlocks.length > 0
      ? safetyBlocks
          .map((s) => (typeof s.intensity_max === 'number' ? s.intensity_max : 1))
          .reduce((a, b) => Math.min(a, b), 1)
      : 0.8
  const intensityDefaultByPresets =
    safetyBlocks.length > 0
      ? safetyBlocks
          .map((s) => (typeof s.intensity_default === 'number' ? s.intensity_default : 0.3))
          .reduce((a, b) => Math.min(a, b), Infinity)
      : 0.3

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
