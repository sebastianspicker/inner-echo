import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { copyTextToClipboard } from './clipboard'
import { logger } from '../../../platform/logger'
import {
  DEFAULT_PRESET_NAME,
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
import { decodePresetFromHash, encodePresetToHash } from './presetShare'

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
  // Loading configuration is not the dedicated sound activation action.
  applyPresetPayload({ ...payload, audioEnabled: false }, callbacks)
}

function nowIso(): string {
  return new Date().toISOString()
}

function parseLegacyPreset(raw: string): PresetPayload | null {
  try {
    return migrateLegacyPresetPayload(JSON.parse(raw))
  } catch {
    return null
  }
}

function migrateLegacyPreset(raw: string): PresetSnapshotV2 | null {
  const payload = parseLegacyPreset(raw)
  if (!payload) return null
  const snapshot = createPresetSnapshot(payload, {
    name: 'Migrated Preset',
    createdAt: nowIso(),
  })
  localStorage.setItem(PRESET_LIBRARY_STORAGE_KEY, JSON.stringify([snapshot]))
  localStorage.removeItem(LEGACY_PRESET_STORAGE_KEY)
  return snapshot
}

function loadPresetLibrary(): LoadedPresetLibrary {
  const raw = localStorage.getItem(PRESET_LIBRARY_STORAGE_KEY)
  const parsedResult = raw ? parsePresetLibraryWithDiagnostics(raw) : null
  const snapshots = parsedResult?.snapshots ?? []
  const parseWarning = parsedResult && !parsedResult.diagnostics.ok

  if (parseWarning && snapshots.length === 0) {
    return { snapshots, warning: PRESET_LIBRARY_PARSE_WARNING }
  }
  if (snapshots.length > 0) {
    return { snapshots, warning: parseWarning ? PRESET_LIBRARY_PARSE_WARNING : null }
  }

  const legacyRaw = localStorage.getItem(LEGACY_PRESET_STORAGE_KEY)
  if (!legacyRaw) return { snapshots, warning: null }
  const migrated = migrateLegacyPreset(legacyRaw)
  if (!migrated) return { snapshots, warning: LEGACY_PRESET_MIGRATION_WARNING }
  return { snapshots: [migrated], warning: null }
}

export interface UsePresetLibraryOptions {
  currentPayload: PresetPayload
  payloadCallbacks: ApplyPresetPayloadCallbacks
}

export function usePresetLibrary({ currentPayload, payloadCallbacks }: UsePresetLibraryOptions) {
  const [library, setLibrary] = useState<PresetSnapshotV2[]>([])
  const [deletedSnapshot, setDeletedSnapshot] = useState<PresetSnapshotV2 | null>(null)
  const [libraryWarning, setLibraryWarning] = useState<string | null>(null)
  const [selectedLibraryId, setSelectedLibraryId] = useState('')
  const [presetName, setPresetName] = useState(DEFAULT_PRESET_NAME)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [copyAction, setCopyAction] = useState<'configuration' | 'share-link'>('configuration')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'deleted' | 'loaded'>('idle')
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const consumedSharedHashRef = useRef(false)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    }
  }, [])

  const setCopyStatusTimed = useCallback(
    (status: 'copied' | 'failed', action: 'configuration' | 'share-link') => {
      setCopyAction(action)
      setCopyStatus(status)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopyStatus('idle'), 2000)
    },
    [],
  )

  const setSaveStatusTimed = useCallback((status: 'saved' | 'deleted' | 'loaded') => {
    setSaveStatus(status)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }, [])

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
    } catch (err) {
      logger.warn('ExperienceComposerPanel preset library load failed', err)
      setLibrary([])
    }
  }, [])

  useEffect(() => {
    if (consumedSharedHashRef.current) return
    consumedSharedHashRef.current = true

    const decoded = decodePresetFromHash(window.location.hash)
    if (!decoded.ok) return

    applyPassivePresetConfiguration(decoded.payload, payloadCallbacks)
    setSaveStatusTimed('loaded')

    const clearedUrl = `${window.location.pathname}${window.location.search}`
    window.history.replaceState(window.history.state, '', clearedUrl)
  }, [payloadCallbacks, setSaveStatusTimed])

  const selectedSnapshot = useMemo(
    () => library.find((item) => item.id === selectedLibraryId) ?? null,
    [library, selectedLibraryId],
  )

  const persistLibrary = useCallback((next: PresetSnapshotV2[]): boolean => {
    try {
      localStorage.setItem(PRESET_LIBRARY_STORAGE_KEY, JSON.stringify(next))
      setLibrary(next)
      setLibraryWarning(null)
      return true
    } catch (err) {
      logger.warn('Failed to persist preset library (storage quota may be exceeded)', err)
      setLibraryWarning(
        'Saved setups could not be updated. Browser storage may be unavailable or full.',
      )
      return false
    }
  }, [])

  const onSelectionChange = useCallback(
    (id: string) => {
      setSelectedLibraryId(id)
      const selected = library.find((item) => item.id === id)
      if (selected) setPresetName(selected.name)
    },
    [library],
  )

  const onCopyConfiguration = useCallback(async () => {
    const ok = await copyTextToClipboard(JSON.stringify(currentPayload, null, 2))
    setCopyStatusTimed(ok ? 'copied' : 'failed', 'configuration')
  }, [currentPayload, setCopyStatusTimed])

  const onCopyShareLink = useCallback(async () => {
    const hash = encodePresetToHash(currentPayload)
    const url = `${window.location.origin}${window.location.pathname}${hash}`
    const ok = await copyTextToClipboard(url)
    setCopyStatusTimed(ok ? 'copied' : 'failed', 'share-link')
  }, [currentPayload, setCopyStatusTimed])

  const onSave = useCallback(() => {
    const snapshot = createPresetSnapshot(currentPayload, {
      name: presetName,
      createdAt: nowIso(),
    })
    const next = [snapshot, ...library.filter((item) => item.id !== snapshot.id)].slice(0, 30)
    if (!persistLibrary(next)) return
    setSelectedLibraryId(snapshot.id)
    setPresetName(snapshot.name)
    setSaveStatusTimed('saved')
  }, [currentPayload, library, persistLibrary, presetName, setSaveStatusTimed])

  const onUpdate = useCallback(() => {
    if (!selectedSnapshot) return
    const updated: PresetSnapshotV2 = {
      ...selectedSnapshot,
      name: presetName.trim() || selectedSnapshot.name,
      createdAt: nowIso(),
      payload: currentPayload,
    }
    const next = library.map((item) => (item.id === selectedSnapshot.id ? updated : item))
    if (!persistLibrary(next)) return
    setSaveStatusTimed('saved')
  }, [currentPayload, library, persistLibrary, presetName, selectedSnapshot, setSaveStatusTimed])

  const onDelete = useCallback(() => {
    if (!selectedSnapshot) return
    const next = library.filter((item) => item.id !== selectedSnapshot.id)
    if (!persistLibrary(next)) return
    setDeletedSnapshot(selectedSnapshot)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => setDeletedSnapshot(null), 8000)
    const newSelected = next[0]
    setSelectedLibraryId(newSelected?.id ?? '')
    setPresetName(newSelected?.name ?? DEFAULT_PRESET_NAME)
    setSaveStatusTimed('deleted')
  }, [library, persistLibrary, selectedSnapshot, setSaveStatusTimed])

  const onUndoDelete = useCallback(() => {
    if (!deletedSnapshot) return
    if (!persistLibrary([deletedSnapshot, ...library])) return
    setSelectedLibraryId(deletedSnapshot.id)
    setPresetName(deletedSnapshot.name)
    setDeletedSnapshot(null)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setSaveStatusTimed('saved')
  }, [deletedSnapshot, library, persistLibrary, setSaveStatusTimed])

  const onLoad = useCallback(() => {
    if (!selectedSnapshot) return
    applyPassivePresetConfiguration(selectedSnapshot.payload, payloadCallbacks)
    setSaveStatusTimed('loaded')
  }, [payloadCallbacks, selectedSnapshot, setSaveStatusTimed])

  return {
    library,
    selectedLibraryId,
    presetName,
    libraryWarning,
    selectedSnapshot,
    copyStatus,
    copyAction,
    saveStatus,
    canUndoDelete: deletedSnapshot != null,
    onNameChange: setPresetName,
    onSelectionChange,
    onSave,
    onUpdate,
    onLoad,
    onDelete,
    onCopyConfiguration,
    onCopyShareLink,
    onUndoDelete,
  }
}
