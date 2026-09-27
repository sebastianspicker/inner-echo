import { z } from 'zod'
import type {
  ComposerMode,
  SelectedDimension,
  SelectedPreset,
} from '../../../domain/experience/composition/types'
import { clamp01 } from '../../../shared/numbers'

const zIdentifier = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_-]+$/i)

export const presetPayloadSchema = z.object({
  mode: z.enum(['preset', 'multimorbid', 'symptom']),
  conditionId: zIdentifier,
  presets: z.array(
    z.object({
      profileId: zIdentifier,
      weight: z.number().min(0).max(1),
    }),
  ),
  dimensions: z.array(
    z.object({
      dimensionId: zIdentifier,
      weight: z.number().min(0).max(1),
    }),
  ),
  intensity: z.number().min(0).max(1),
  safeMode: z.boolean(),
  reducedMotion: z.boolean(),
  audioEnabled: z.boolean(),
  couplingStrength: z.number().min(0).max(1),
  maxFeedback: z.number().min(0).max(1),
  interactionAmount: z.number().min(0).max(1),
})

export type PresetPayload = z.infer<typeof presetPayloadSchema>

function normalizeWeight(value: number): number {
  return clamp01(Number.isFinite(value) ? value : 0)
}

function normalizePresets(presets: SelectedPreset[]): SelectedPreset[] {
  return normalizeKeyed(presets, 'profileId')
}

function normalizeDimensions(dimensions: SelectedDimension[]): SelectedDimension[] {
  return normalizeKeyed(dimensions, 'dimensionId')
}

function normalizeKeyed<T extends { weight: number }, K extends keyof T & string>(
  values: T[],
  key: K,
): T[] {
  return values
    .filter((item) => Boolean(item[key]))
    .map(
      (item) =>
        ({
          [key]: String(item[key]),
          weight: normalizeWeight(item.weight),
        }) as T,
    )
    .sort((a, b) => String(a[key]).localeCompare(String(b[key])))
}

export function createPresetPayload(input: PresetPayload): PresetPayload {
  return {
    mode: input.mode,
    conditionId: input.conditionId || 'none',
    presets: normalizePresets(input.presets),
    dimensions: normalizeDimensions(input.dimensions),
    intensity: clamp01(input.intensity),
    safeMode: !!input.safeMode,
    reducedMotion: !!input.reducedMotion,
    audioEnabled: !!input.audioEnabled,
    couplingStrength: clamp01(input.couplingStrength),
    maxFeedback: clamp01(input.maxFeedback),
    interactionAmount: clamp01(input.interactionAmount),
  }
}

export function encodePresetPayload(payload: PresetPayload): string {
  return JSON.stringify(createPresetPayload(payload))
}

export function decodePresetPayload(serialized: string): PresetPayload | null {
  try {
    const parsed = JSON.parse(serialized)
    const result = presetPayloadSchema.safeParse(parsed)
    if (!result.success) return null
    return createPresetPayload(result.data)
  } catch {
    return null
  }
}

export interface ApplyPresetPayloadCallbacks {
  onModeChange: (mode: ComposerMode) => void
  onConditionIdChange: (id: string) => void
  onPresetsChange: (presets: SelectedPreset[]) => void
  onDimensionsChange: (dimensions: SelectedDimension[]) => void
  onIntensityChange: (value: number) => void
  onSafeModeChange: (value: boolean) => void
  onReducedMotionChange: (value: boolean) => void
  onAudioEnabledChange: (value: boolean) => void
  onCouplingStrengthChange: (value: number) => void
  onMaxFeedbackChange: (value: number) => void
  onInteractionAmountChange: (value: number) => void
}

export function applyPresetPayload(
  payload: PresetPayload,
  callbacks: ApplyPresetPayloadCallbacks,
): void {
  callbacks.onModeChange(payload.mode)
  callbacks.onConditionIdChange(payload.conditionId)
  callbacks.onPresetsChange(payload.presets)
  callbacks.onDimensionsChange(payload.dimensions)
  callbacks.onIntensityChange(payload.intensity)
  callbacks.onSafeModeChange(payload.safeMode)
  callbacks.onReducedMotionChange(payload.reducedMotion)
  callbacks.onAudioEnabledChange(payload.audioEnabled)
  callbacks.onCouplingStrengthChange(payload.couplingStrength)
  callbacks.onMaxFeedbackChange(payload.maxFeedback)
  callbacks.onInteractionAmountChange(payload.interactionAmount)
}
