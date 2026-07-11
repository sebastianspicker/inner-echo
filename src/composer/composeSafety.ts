/**
 * Safety derivation and param clamping for composition.
 * Safe-Mode-Clamps, intensity_max, reduced_motion_policy, and runtime clamps for video/audio params.
 */

import type { Profile, VideoStackNodeDef, AudioStackConfig } from '../conditions/schema'
import { clamp01, type ComposerSettings } from './types'
import { clamp } from '../utils/numeric'
import {
  mergeSafeModeClamps,
  mergeWarnings,
  mergeDisableNodes,
  normalizeNodeType,
} from './composeBlend'

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

  const chain = (config.chain ?? []).map((n) => {
    const node = normalizeNodeType(n.node)
    const params = { ...(n.params ?? {}) }
    if (node === 'noise_bed' && typeof params.level === 'number') {
      params.level = clamp(params.level, 0, maxNoise)
    }
    if (node === 'tremolo') {
      if (typeof params.rate === 'number') params.rate = clamp(params.rate, 0, maxTremoloRate)
      if (typeof params.depth === 'number') params.depth = clamp(params.depth, 0, maxTremoloDepth)
    }
    if (node === 'delay' && typeof params.feedback === 'number') {
      params.feedback = clamp(params.feedback, 0, 0.18 * hardMaxFeedback)
    }
    return { ...n, node, params }
  })
  return { ...config, chain }
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

  return stack.map((def) =>
    clampVideoNode(def, hard, { maxFeedback, maxJitter, maxPulseDepth, maxChroma }),
  )
}

const UNBOUNDED_VIDEO_PARAMS = new Set([
  'rate',
  'cutoff',
  'burst_duration_ms',
  'burst_min_gap_ms',
  'scale',
  'decay',
  'jitter',
])

function clampVideoNode(
  def: VideoStackNodeDef,
  hard: (value: number, maximum: number) => number,
  limits: { maxFeedback: number; maxJitter: number; maxPulseDepth: number; maxChroma: number },
): VideoStackNodeDef {
  const node = normalizeNodeType(def.node)
  const params: Record<string, unknown> = { ...(def.params ?? {}) }
  if (
    (node === 'temporal_smear' || node === 'feedback_loop') &&
    typeof params.feedback === 'number'
  ) {
    params.feedback = hard(params.feedback, limits.maxFeedback)
  }
  if (node === 'focus_jitter' && typeof params.amount === 'number') {
    params.amount = hard(params.amount, limits.maxJitter)
  }
  if (node === 'pulse' && typeof params.depth === 'number') {
    params.depth = hard(params.depth, limits.maxPulseDepth)
  }
  if (isChromaNode(node) && typeof params.amount === 'number') {
    params.amount = hard(params.amount, limits.maxChroma)
  }
  if (
    (node === 'temporal_smear' || node === 'feedback_loop') &&
    typeof params.jitter === 'number'
  ) {
    params.jitter = clamp(params.jitter, 0, limits.maxJitter)
  }
  clampUnitVideoParams(params)
  return { ...def, node, params }
}

function isChromaNode(node: string): boolean {
  return node === 'chroma_aberration' || node === 'chromatic_aberration'
}

function clampUnitVideoParams(params: Record<string, unknown>): void {
  for (const key of Object.keys(params)) {
    const value = params[key]
    if (typeof value === 'number' && !UNBOUNDED_VIDEO_PARAMS.has(key)) {
      params[key] = clamp(value, -1, 1)
    }
  }
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

function mergeDimensionSafety(
  cleanedDims: Array<{ dimensionId: string; weight: number }>,
  getDimensionSafety: (dimensionId: string) => DimensionSafetyEntry | null,
  safeModeClampsList: Array<Record<string, unknown> | undefined>,
  reducedMotionDisableLists: Array<string[] | undefined>,
  warningsLists: string[][],
) {
  for (const { dimensionId } of cleanedDims) {
    const safety = getDimensionSafety(dimensionId)?.safety
    if (safety?.warnings?.length) warningsLists.push(safety.warnings)
    if (safety?.clamps) safeModeClampsList.push(safety.clamps)
    if (safety?.reduced_motion?.disable_nodes?.length) {
      reducedMotionDisableLists.push(safety.reduced_motion.disable_nodes)
    }
  }
}

function presetIntensity(
  safetyBlocks: Array<Profile['safety']>,
  key: 'intensity_max' | 'intensity_default',
  fallback: number,
): number {
  if (!safetyBlocks.length) return fallback
  return safetyBlocks
    .map((s) => (typeof s[key] === 'number' ? s[key] : key === 'intensity_max' ? 1 : 0.3))
    .reduce((minimum, value) => Math.min(minimum, value), key === 'intensity_max' ? 1 : Infinity)
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

  mergeDimensionSafety(
    cleanedDims,
    getDimensionSafety,
    safeModeClampsList,
    reducedMotionDisableLists,
    warningsLists,
  )

  const mergedSafeModeClamps = mergeSafeModeClamps(safeModeClampsList)
  const mergedWarnings = mergeWarnings(warningsLists)
  const mergedDisableNodes = mergeDisableNodes(reducedMotionDisableLists)

  const intensityMaxByPresets = presetIntensity(safetyBlocks, 'intensity_max', 0.8)
  const intensityDefaultByPresets = presetIntensity(safetyBlocks, 'intensity_default', 0.3)

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
