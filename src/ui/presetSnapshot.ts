import { z } from 'zod'
import type { ComposerMode, SelectedDimension, SelectedPreset } from '../composer'
import { clamp01 } from '../utils/numeric'

export const PRESET_LIBRARY_STORAGE_KEY = 'ie_custom_presets_v2'
export const DEFAULT_PRESET_NAME = 'My Preset'

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

export const presetSnapshotV2Schema = z.object({
  version: z.literal(2),
  id: z.string(),
  name: z.string().min(1).max(200),
  createdAt: z.string(),
  payload: presetPayloadSchema,
})

export type PresetSnapshotV2 = z.infer<typeof presetSnapshotV2Schema>

export type PresetLibraryParseReason =
  | 'empty'
  | 'valid'
  | 'invalid-json'
  | 'not-array'
  | 'invalid-items'

export interface PresetLibraryParseDiagnostics {
  ok: boolean
  reason: PresetLibraryParseReason
  totalItems: number
  invalidItems: number
}

export interface PresetLibraryParseResult {
  snapshots: PresetSnapshotV2[]
  diagnostics: PresetLibraryParseDiagnostics
}

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
  options?: { name?: string; id?: string; createdAt?: string },
): PresetSnapshotV2 {
  const timestamp = options?.createdAt ?? new Date().toISOString()
  return {
    version: 2,
    id: options?.id ?? crypto.randomUUID(),
    name: options?.name?.trim() || DEFAULT_PRESET_NAME,
    createdAt: timestamp,
    payload: createPresetPayload(payload),
  }
}

export function parsePresetLibrary(serialized: string): PresetSnapshotV2[] {
  return parsePresetLibraryWithDiagnostics(serialized).snapshots
}

export function parsePresetLibraryWithDiagnostics(serialized: string): PresetLibraryParseResult {
  try {
    const parsed = JSON.parse(serialized)
    if (!Array.isArray(parsed)) {
      return {
        snapshots: [],
        diagnostics: { ok: false, reason: 'not-array', totalItems: 0, invalidItems: 0 },
      }
    }
    const out: PresetSnapshotV2[] = []
    let invalidItems = 0
    for (const item of parsed) {
      const result = presetSnapshotV2Schema.safeParse(item)
      if (result.success) {
        out.push(result.data)
      } else {
        invalidItems += 1
      }
    }
    return {
      snapshots: out,
      diagnostics: {
        ok: invalidItems === 0,
        reason: parsed.length === 0 ? 'empty' : invalidItems === 0 ? 'valid' : 'invalid-items',
        totalItems: parsed.length,
        invalidItems,
      },
    }
  } catch {
    return {
      snapshots: [],
      diagnostics: { ok: false, reason: 'invalid-json', totalItems: 0, invalidItems: 0 },
    }
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
