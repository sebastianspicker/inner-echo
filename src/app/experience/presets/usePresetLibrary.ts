import { useEffect, useRef } from 'react'
import { logger } from '../../../platform/logger'
import {
  LEGACY_PRESET_STORAGE_KEY,
  PRESET_LIBRARY_STORAGE_KEY,
  createPresetSnapshot,
  migrateLegacyPresetPayload,
  parsePresetLibraryWithDiagnostics,
  type PresetSnapshotV2,
} from './library'
import {
  applyPresetPayload,
  type ApplyPresetPayloadCallbacks,
  type PresetPayload,
} from './payloadCodec'
import { decodePresetFromHash } from './presetShare'
import {
  usePresetFeedback,
  usePresetLibraryActions,
  usePresetLibraryState,
} from './presetLibraryHooks'

const PRESET_LIBRARY_PARSE_WARNING =
  'Saved preset library could not be read completely. Existing storage was left unchanged.'
const LEGACY_PRESET_MIGRATION_WARNING =
  'Legacy preset storage could not be migrated. Existing storage was left unchanged.'

interface LoadedPresetLibrary {
  snapshots: PresetSnapshotV2[]
  warning: string | null
}

export function applyPassivePresetConfiguration(
  payload: PresetPayload,
  callbacks: ApplyPresetPayloadCallbacks,
): void {
  applyPresetPayload({ ...payload, audioEnabled: false }, callbacks)
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

function loadPresetLibrary(): LoadedPresetLibrary {
  const parsed = parseCurrentLibrary()
  if (parsed.snapshots.length > 0 || parsed.warning) return parsed
  const legacyRaw = localStorage.getItem(LEGACY_PRESET_STORAGE_KEY)
  if (!legacyRaw) return parsed
  const migrated = migrateLegacyPreset(legacyRaw)
  return migrated
    ? { snapshots: [migrated], warning: null }
    : { snapshots: [], warning: LEGACY_PRESET_MIGRATION_WARNING }
}

function parseCurrentLibrary(): LoadedPresetLibrary {
  const raw = localStorage.getItem(PRESET_LIBRARY_STORAGE_KEY)
  if (!raw) return { snapshots: [], warning: null }
  const result = parsePresetLibraryWithDiagnostics(raw)
  const warning = result.diagnostics.ok ? null : PRESET_LIBRARY_PARSE_WARNING
  return { snapshots: result.snapshots, warning }
}

export interface UsePresetLibraryOptions {
  currentPayload: PresetPayload
  payloadCallbacks: ApplyPresetPayloadCallbacks
}

export function usePresetLibrary({ currentPayload, payloadCallbacks }: UsePresetLibraryOptions) {
  const state = usePresetLibraryState()
  const feedback = usePresetFeedback(state)
  useStoredPresetLibrary(state)
  useSharedPresetHash(payloadCallbacks, feedback)
  const actions = usePresetLibraryActions({
    state,
    feedback,
    currentPayload,
    payloadCallbacks,
    applyPassive: applyPassivePresetConfiguration,
  })
  const { selectedSnapshot, ...handlers } = actions
  return {
    library: state.library,
    selectedLibraryId: state.selectedLibraryId,
    presetName: state.presetName,
    libraryWarning: state.libraryWarning,
    selectedSnapshot,
    copyStatus: state.copyStatus,
    copyAction: state.copyAction,
    saveStatus: state.saveStatus,
    canUndoDelete: state.deletedSnapshot != null,
    onNameChange: state.setPresetName,
    ...handlers,
  }
}

function useStoredPresetLibrary(state: ReturnType<typeof usePresetLibraryState>): void {
  const { setLibrary, setLibraryWarning, setSelectedLibraryId, setPresetName } = state
  useEffect(() => {
    try {
      const loaded = loadPresetLibrary()
      setLibrary(loaded.snapshots)
      setLibraryWarning(loaded.warning)
      const selected = loaded.snapshots[0]
      if (selected) {
        setSelectedLibraryId(selected.id)
        setPresetName(selected.name)
      }
    } catch (error) {
      logger.warn('ExperienceComposerPanel preset library load failed', error)
      setLibrary([])
    }
  }, [setLibrary, setLibraryWarning, setSelectedLibraryId, setPresetName])
}

function useSharedPresetHash(
  callbacks: ApplyPresetPayloadCallbacks,
  feedback: ReturnType<typeof usePresetFeedback>,
): void {
  const consumedHashRef = useRef(false)
  useEffect(() => {
    if (consumedHashRef.current) return
    consumedHashRef.current = true
    const decoded = decodePresetFromHash(window.location.hash)
    if (!decoded.ok) return
    applyPassivePresetConfiguration(decoded.payload, callbacks)
    feedback.setSaveStatusTimed('loaded')
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}`,
    )
  }, [callbacks, feedback])
}
