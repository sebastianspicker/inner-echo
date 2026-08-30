import { z } from 'zod'
import { createPresetPayload, presetPayloadSchema, type PresetPayload } from './payloadCodec'

export const PRESET_LIBRARY_STORAGE_KEY = 'ie_custom_presets_v2'
export const LEGACY_PRESET_STORAGE_KEY = 'ie_custom_preset'
export const DEFAULT_PRESET_NAME = 'My Preset'

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
    const snapshots: PresetSnapshotV2[] = []
    let invalidItems = 0
    for (const item of parsed) {
      const result = presetSnapshotV2Schema.safeParse(item)
      if (result.success) {
        snapshots.push(result.data)
      } else {
        invalidItems += 1
      }
    }
    return {
      snapshots,
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
          }),
        )
        .optional(),
      dimensions: z
        .array(
          z.object({
            dimensionId: z.string(),
            weight: z.number(),
          }),
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
  const payload = createPresetPayload({
    mode: value.mode ?? 'preset',
    conditionId: value.conditionId ?? 'none',
    presets: value.presets ?? [],
    dimensions: value.dimensions ?? [],
    intensity: value.intensity ?? 0.5,
    safeMode: value.safeMode ?? true,
    reducedMotion: value.reducedMotion ?? false,
    audioEnabled: value.audioEnabled ?? false,
    couplingStrength: value.couplingStrength ?? 0.5,
    maxFeedback: value.maxFeedback ?? 0.35,
    interactionAmount: value.interactionAmount ?? 0.15,
  })
  const validated = presetPayloadSchema.safeParse(payload)
  return validated.success ? validated.data : null
}
