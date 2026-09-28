/**
 * The pure persisted preset contract: payload schema/normalizer, the #preset= hash
 * encoding, the saved-setup snapshot schema, and legacy migration. No browser storage
 * access lives here; see storage.ts for localStorage load/migrate/persist.
 */
import { z } from 'zod'
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
    presets: normalizeKeyed(input.presets, 'profileId'),
    dimensions: normalizeKeyed(input.dimensions, 'dimensionId'),
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

const HASH_PREFIX = '#preset='
const MAX_HASH_PAYLOAD_LENGTH = 8192

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const withPadding = padded + '='.repeat((4 - (padded.length % 4 || 4)) % 4)
  const binary = atob(withPadding)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodePresetToHash(payload: PresetPayload): string {
  const serialized = encodePresetPayload(payload)
  return `${HASH_PREFIX}${toBase64Url(serialized)}`
}

export function decodePresetFromHash(
  hash: string,
): { ok: true; payload: PresetPayload } | { ok: false; reason: string } {
  if (!hash.startsWith(HASH_PREFIX)) {
    return { ok: false, reason: 'missing-prefix' }
  }
  if (hash.length > MAX_HASH_PAYLOAD_LENGTH) {
    return { ok: false, reason: 'payload-too-large' }
  }
  const token = hash.slice(HASH_PREFIX.length).trim()
  if (!token) return { ok: false, reason: 'empty' }
  try {
    const serialized = fromBase64Url(token)
    const payload = decodePresetPayload(serialized)
    if (!payload) return { ok: false, reason: 'invalid-payload' }
    return { ok: true, payload }
  } catch {
    return { ok: false, reason: 'decode-failed' }
  }
}

export const DEFAULT_PRESET_NAME = 'My Preset'

export const presetSnapshotV2Schema = z.object({
  version: z.literal(2),
  id: z.string(),
  name: z.string().min(1).max(200),
  createdAt: z.string(),
  payload: presetPayloadSchema,
})

export type PresetSnapshotV2 = z.infer<typeof presetSnapshotV2Schema>

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

const legacyPresetSchema = z
  .object({
    mode: z.enum(['preset', 'multimorbid', 'symptom']).optional(),
    conditionId: z.string().optional(),
    presets: z.array(z.object({ profileId: z.string(), weight: z.number() })).optional(),
    dimensions: z.array(z.object({ dimensionId: z.string(), weight: z.number() })).optional(),
    intensity: z.number().optional(),
    safeMode: z.boolean().optional(),
    reducedMotion: z.boolean().optional(),
    audioEnabled: z.boolean().optional(),
    couplingStrength: z.number().optional(),
    maxFeedback: z.number().optional(),
    interactionAmount: z.number().optional(),
  })
  .passthrough()

function createMigratedPresetPayload(value: z.infer<typeof legacyPresetSchema>): PresetPayload {
  return createPresetPayload({
    mode: value.mode ?? 'preset',
    conditionId: value.conditionId ?? 'none',
    presets: value.presets ?? [],
    dimensions: value.dimensions ?? [],
    intensity: value.intensity ?? 0.5,
    safeMode: value.safeMode ?? true,
    reducedMotion: value.reducedMotion ?? false,
    audioEnabled: value.audioEnabled ?? false,
    couplingStrength: value.couplingStrength ?? 0,
    maxFeedback: value.maxFeedback ?? 0.35,
    interactionAmount: value.interactionAmount ?? 0.15,
  })
}

export function migrateLegacyPresetPayload(raw: unknown): PresetPayload | null {
  const parsed = legacyPresetSchema.safeParse(raw)
  if (!parsed.success) return null
  const payload = createMigratedPresetPayload(parsed.data)
  const validated = presetPayloadSchema.safeParse(payload)
  return validated.success ? validated.data : null
}
