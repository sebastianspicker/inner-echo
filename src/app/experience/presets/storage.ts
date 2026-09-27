/** localStorage load/migrate/persist for the saved preset library. */
import { logger } from '../../../platform/logger'
import {
  migrateLegacyPresetPayload,
  presetSnapshotV2Schema,
  createPresetSnapshot,
  type PresetSnapshotV2,
} from './format'

export const PRESET_LIBRARY_STORAGE_KEY = 'ie_custom_presets_v2'
export const LEGACY_PRESET_STORAGE_KEY = 'ie_custom_preset'

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

const PRESET_LIBRARY_PARSE_WARNING =
  'Saved preset library could not be read completely. Existing storage was left unchanged.'
const LEGACY_PRESET_MIGRATION_WARNING =
  'Legacy preset storage could not be migrated. Existing storage was left unchanged.'

export interface LoadedPresetLibrary {
  snapshots: PresetSnapshotV2[]
  warning: string | null
}

function nowIso(): string {
  return new Date().toISOString()
}

function migrateLegacyPreset(raw: string): PresetSnapshotV2 | null {
  try {
    const payload = migrateLegacyPresetPayload(JSON.parse(raw))
    if (!payload) return null
    const snapshot = createPresetSnapshot(payload, { name: 'Migrated Preset', createdAt: nowIso() })
    localStorage.setItem(PRESET_LIBRARY_STORAGE_KEY, JSON.stringify([snapshot]))
    localStorage.removeItem(LEGACY_PRESET_STORAGE_KEY)
    return snapshot
  } catch {
    return null
  }
}

function parseCurrentLibrary(): LoadedPresetLibrary {
  const raw = localStorage.getItem(PRESET_LIBRARY_STORAGE_KEY)
  if (!raw) return { snapshots: [], warning: null }
  const result = parsePresetLibraryWithDiagnostics(raw)
  const warning = result.diagnostics.ok ? null : PRESET_LIBRARY_PARSE_WARNING
  return { snapshots: result.snapshots, warning }
}

/** Loads the saved library, migrating the legacy single-preset key when v2 is empty and clean. */
export function loadPresetLibrary(): LoadedPresetLibrary {
  const parsed = parseCurrentLibrary()
  if (parsed.snapshots.length > 0 || parsed.warning) return parsed
  const legacyRaw = localStorage.getItem(LEGACY_PRESET_STORAGE_KEY)
  if (!legacyRaw) return parsed
  const migrated = migrateLegacyPreset(legacyRaw)
  return migrated
    ? { snapshots: [migrated], warning: null }
    : { snapshots: [], warning: LEGACY_PRESET_MIGRATION_WARNING }
}

/** Best-effort persist; returns false (with a logged warning) when storage is unavailable or full. */
export function persistPresetLibrary(snapshots: PresetSnapshotV2[]): boolean {
  try {
    localStorage.setItem(PRESET_LIBRARY_STORAGE_KEY, JSON.stringify(snapshots))
    return true
  } catch (error) {
    logger.warn('Failed to persist preset library (storage quota may be exceeded)', error)
    return false
  }
}
