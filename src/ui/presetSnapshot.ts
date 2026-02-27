import { z } from 'zod'
import type { ComposerMode, SelectedDimension, SelectedPreset } from '../composer'
import { clamp01 } from '../utils/numeric'

export const PRESET_LIBRARY_STORAGE_KEY = 'ie_custom_presets_v2'
export const LEGACY_PRESET_STORAGE_KEY = 'ie_custom_preset'
export const DEFAULT_PRESET_NAME = 'My Preset'

export const presetPayloadSchema = z.object({
  mode: z.enum(['preset', 'multimorbid', 'symptom']),
  conditionId: z.string(),
  presets: z.array(
    z.object({
      profileId: z.string(),
      weight: z.number(),
    })
  ),
  dimensions: z.array(
    z.object({
      dimensionId: z.string(),
      weight: z.number(),
    })
  ),
  intensity: z.number(),
  safeMode: z.boolean(),
  reducedMotion: z.boolean(),
  audioEnabled: z.boolean(),
  couplingStrength: z.number(),
  maxFeedback: z.number(),
  interactionAmount: z.number(),
})

export type PresetPayload = z.infer<typeof presetPayloadSchema>

export const presetSnapshotV2Schema = z.object({
  version: z.literal(2),
  id: z.string(),
  name: z.string().min(1),
  createdAt: z.string(),
  payload: presetPayloadSchema,
})

export type PresetSnapshotV2 = z.infer<typeof presetSnapshotV2Schema>

function normalizeWeight(value: number): number {
  return clamp01(Number.isFinite(value) ? value : 0)
}

function normalizePresets(presets: SelectedPreset[]): SelectedPreset[] {
  return presets
    .filter((item) => item.profileId)
    .map((item) => ({
      profileId: String(item.profileId),
      weight: normalizeWeight(item.weight),
    }))
    .sort((a, b) => a.profileId.localeCompare(b.profileId))
}

function normalizeDimensions(dimensions: SelectedDimension[]): SelectedDimension[] {
  return dimensions
    .filter((item) => item.dimensionId)
    .map((item) => ({
      dimensionId: String(item.dimensionId),
      weight: normalizeWeight(item.weight),
    }))
    .sort((a, b) => a.dimensionId.localeCompare(b.dimensionId))
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

export function createPresetSnapshot(
  payload: PresetPayload,
  options?: { name?: string; id?: string; createdAt?: string }
): PresetSnapshotV2 {
  const timestamp = options?.createdAt ?? new Date().toISOString()
  return {
    version: 2,
    id: options?.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: options?.name?.trim() || DEFAULT_PRESET_NAME,
    createdAt: timestamp,
    payload: createPresetPayload(payload),
  }
}

export function parsePresetLibrary(serialized: string): PresetSnapshotV2[] {
  try {
    const parsed = JSON.parse(serialized)
    if (!Array.isArray(parsed)) return []
    const out: PresetSnapshotV2[] = []
    for (const item of parsed) {
      const result = presetSnapshotV2Schema.safeParse(item)
      if (result.success) out.push(result.data)
    }
    return out
  } catch {
    return []
  }
}

export function migrateLegacyPresetPayload(raw: unknown): PresetPayload | null {
  const legacySchema = z
    .object({
      mode: z.enum(['preset', 'multimorbid', 'symptom']).optional(),
      conditionId: z.string().optional(),
      presets: z
        .array(
          z.object({
            profileId: z.string(),
            weight: z.number(),
          })
        )
        .optional(),
      dimensions: z
        .array(
          z.object({
            dimensionId: z.string(),
            weight: z.number(),
          })
        )
        .optional(),
      intensity: z.number().optional(),
      safeMode: z.boolean().optional(),
      reducedMotion: z.boolean().optional(),
      audioEnabled: z.boolean().optional(),
      couplingStrength: z.number().optional(),
      maxFeedback: z.number().optional(),
      interactionAmount: z.number().optional(),
    })
    .passthrough()

  const parsed = legacySchema.safeParse(raw)
  if (!parsed.success) return null
  const value = parsed.data
  return createPresetPayload({
    mode: value.mode ?? 'preset',
    conditionId: value.conditionId ?? 'none',
    presets: value.presets ?? [],
    dimensions: value.dimensions ?? [],
    intensity: value.intensity ?? 0.5,
    safeMode: value.safeMode ?? false,
    reducedMotion: value.reducedMotion ?? false,
    audioEnabled: value.audioEnabled ?? false,
    couplingStrength: value.couplingStrength ?? 0.5,
    maxFeedback: value.maxFeedback ?? 0.35,
    interactionAmount: value.interactionAmount ?? 0.15,
  })
}

export function readPresetLibrary(storage: Pick<Storage, 'getItem'>): PresetSnapshotV2[] {
  const raw = storage.getItem(PRESET_LIBRARY_STORAGE_KEY)
  if (!raw) return []
  return parsePresetLibrary(raw)
}

export function writePresetLibrary(
  storage: Pick<Storage, 'setItem'>,
  snapshots: PresetSnapshotV2[]
): void {
  storage.setItem(PRESET_LIBRARY_STORAGE_KEY, JSON.stringify(snapshots))
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
  callbacks: ApplyPresetPayloadCallbacks
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
