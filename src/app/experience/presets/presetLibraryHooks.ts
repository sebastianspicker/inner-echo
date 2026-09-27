import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { logger } from '../../../platform/logger'
import { copyTextToClipboard } from './clipboard'
import {
  DEFAULT_PRESET_NAME,
  PRESET_LIBRARY_STORAGE_KEY,
  createPresetSnapshot,
  type PresetSnapshotV2,
} from './library'
import type { ApplyPresetPayloadCallbacks, PresetPayload } from './payloadCodec'
import { encodePresetToHash } from './presetShare'

export type CopyStatus = 'idle' | 'copied' | 'failed'
export type CopyAction = 'configuration' | 'share-link'
export type SaveStatus = 'idle' | 'saved' | 'deleted' | 'loaded'

export interface PresetLibraryState {
  library: PresetSnapshotV2[]
  setLibrary: (value: PresetSnapshotV2[]) => void
  deletedSnapshot: PresetSnapshotV2 | null
  setDeletedSnapshot: (value: PresetSnapshotV2 | null) => void
  libraryWarning: string | null
  setLibraryWarning: (value: string | null) => void
  selectedLibraryId: string
  setSelectedLibraryId: (value: string) => void
  presetName: string
  setPresetName: (value: string) => void
  copyStatus: CopyStatus
  setCopyStatus: (value: CopyStatus) => void
  copyAction: CopyAction
  setCopyAction: (value: CopyAction) => void
  saveStatus: SaveStatus
  setSaveStatus: (value: SaveStatus) => void
}

export function usePresetLibraryState(): PresetLibraryState {
  const [library, setLibrary] = useState<PresetSnapshotV2[]>([])
  const [deletedSnapshot, setDeletedSnapshot] = useState<PresetSnapshotV2 | null>(null)
  const [libraryWarning, setLibraryWarning] = useState<string | null>(null)
  const [selectedLibraryId, setSelectedLibraryId] = useState('')
  const [presetName, setPresetName] = useState(DEFAULT_PRESET_NAME)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const [copyAction, setCopyAction] = useState<CopyAction>('configuration')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  return {
    library,
    setLibrary,
    deletedSnapshot,
    setDeletedSnapshot,
    libraryWarning,
    setLibraryWarning,
    selectedLibraryId,
    setSelectedLibraryId,
    presetName,
    setPresetName,
    copyStatus,
    setCopyStatus,
    copyAction,
    setCopyAction,
    saveStatus,
    setSaveStatus,
  }
}

export interface PresetFeedback {
  setCopyStatusTimed: (status: Exclude<CopyStatus, 'idle'>, action: CopyAction) => void
  setSaveStatusTimed: (status: Exclude<SaveStatus, 'idle'>) => void
  resetUndoTimer: (callback: () => void) => void
  clearUndoTimer: () => void
}

export function usePresetFeedback(state: PresetLibraryState): PresetFeedback {
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    },
    [],
  )
  const setCopyStatusTimed = useCallback(
    (status: Exclude<CopyStatus, 'idle'>, action: CopyAction) => {
      state.setCopyAction(action)
      state.setCopyStatus(status)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => state.setCopyStatus('idle'), 2000)
    },
    [state],
  )
  const setSaveStatusTimed = useCallback(
    (status: Exclude<SaveStatus, 'idle'>) => {
      state.setSaveStatus(status)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => state.setSaveStatus('idle'), 2000)
    },
    [state],
  )
  const resetUndoTimer = useCallback((callback: () => void) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(callback, 8000)
  }, [])
  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
  }, [])
  return { setCopyStatusTimed, setSaveStatusTimed, resetUndoTimer, clearUndoTimer }
}

export interface PresetLibraryActions {
  selectedSnapshot: PresetSnapshotV2 | null
  onSelectionChange: (id: string) => void
  onCopyConfiguration: () => Promise<void>
  onCopyShareLink: () => Promise<void>
  onSave: () => void
  onUpdate: () => void
  onDelete: () => void
  onUndoDelete: () => void
  onLoad: () => void
}

interface PresetActionParams {
  state: PresetLibraryState
  feedback: PresetFeedback
  currentPayload: PresetPayload
  payloadCallbacks: ApplyPresetPayloadCallbacks
  applyPassive: (payload: PresetPayload, callbacks: ApplyPresetPayloadCallbacks) => void
}

export function usePresetLibraryActions(params: PresetActionParams): PresetLibraryActions {
  const selectedSnapshot = useMemo(
    () => params.state.library.find((item) => item.id === params.state.selectedLibraryId) ?? null,
    [params.state.library, params.state.selectedLibraryId],
  )
  const persistLibrary = usePersistLibrary(params.state)
  const onSelectionChange = useSelectionChange(params.state)
  const onCopyConfiguration = useCopyConfiguration(params.currentPayload, params.feedback)
  const onCopyShareLink = useCopyShareLink(params.currentPayload, params.feedback)
  const onSave = useSavePreset(params.state, params.feedback, params.currentPayload, persistLibrary)
  const onUpdate = useUpdatePreset(
    params.state,
    params.feedback,
    params.currentPayload,
    persistLibrary,
    selectedSnapshot,
  )
  const onDelete = useDeletePreset(params.state, params.feedback, persistLibrary, selectedSnapshot)
  const onUndoDelete = useUndoDelete(params.state, params.feedback, persistLibrary)
  const onLoad = useCallback(() => {
    if (!selectedSnapshot) return
    params.applyPassive(selectedSnapshot.payload, params.payloadCallbacks)
    params.feedback.setSaveStatusTimed('loaded')
  }, [params, selectedSnapshot])
  return {
    selectedSnapshot,
    onSelectionChange,
    onCopyConfiguration,
    onCopyShareLink,
    onSave,
    onUpdate,
    onDelete,
    onUndoDelete,
    onLoad,
  }
}

function usePersistLibrary(state: PresetLibraryState): (next: PresetSnapshotV2[]) => boolean {
  return useCallback(
    (next: PresetSnapshotV2[]): boolean => {
      try {
        localStorage.setItem(PRESET_LIBRARY_STORAGE_KEY, JSON.stringify(next))
        state.setLibrary(next)
        state.setLibraryWarning(null)
        return true
      } catch (error) {
        logger.warn('Failed to persist preset library (storage quota may be exceeded)', error)
        state.setLibraryWarning(
          'Saved setups could not be updated. Browser storage may be unavailable or full.',
        )
        return false
      }
    },
    [state],
  )
}

function useSelectionChange(state: PresetLibraryState): (id: string) => void {
  return useCallback(
    (id: string) => {
      state.setSelectedLibraryId(id)
      const selected = state.library.find((item) => item.id === id)
      if (selected) state.setPresetName(selected.name)
    },
    [state],
  )
}

function useCopyConfiguration(
  payload: PresetPayload,
  feedback: PresetFeedback,
): () => Promise<void> {
  return useCallback(async () => {
    const copied = await copyTextToClipboard(JSON.stringify(payload, null, 2))
    feedback.setCopyStatusTimed(copied ? 'copied' : 'failed', 'configuration')
  }, [feedback, payload])
}

function useCopyShareLink(payload: PresetPayload, feedback: PresetFeedback): () => Promise<void> {
  return useCallback(async () => {
    const hash = encodePresetToHash(payload)
    const copied = await copyTextToClipboard(
      `${window.location.origin}${window.location.pathname}${hash}`,
    )
    feedback.setCopyStatusTimed(copied ? 'copied' : 'failed', 'share-link')
  }, [feedback, payload])
}

function nowIso(): string {
  return new Date().toISOString()
}

function useSavePreset(
  state: PresetLibraryState,
  feedback: PresetFeedback,
  payload: PresetPayload,
  persist: (next: PresetSnapshotV2[]) => boolean,
): () => void {
  return useCallback(() => {
    const snapshot = createPresetSnapshot(payload, { name: state.presetName, createdAt: nowIso() })
    const next = [snapshot, ...state.library.filter((item) => item.id !== snapshot.id)].slice(0, 30)
    if (!persist(next)) return
    state.setSelectedLibraryId(snapshot.id)
    state.setPresetName(snapshot.name)
    feedback.setSaveStatusTimed('saved')
  }, [feedback, payload, persist, state])
}

function useUpdatePreset(
  state: PresetLibraryState,
  feedback: PresetFeedback,
  payload: PresetPayload,
  persist: (next: PresetSnapshotV2[]) => boolean,
  selected: PresetSnapshotV2 | null,
): () => void {
  return useCallback(() => {
    if (!selected) return
    const updated = {
      ...selected,
      name: state.presetName.trim() || selected.name,
      createdAt: nowIso(),
      payload,
    }
    if (!persist(state.library.map((item) => (item.id === selected.id ? updated : item)))) return
    feedback.setSaveStatusTimed('saved')
  }, [feedback, payload, persist, selected, state.library, state.presetName])
}

function useDeletePreset(
  state: PresetLibraryState,
  feedback: PresetFeedback,
  persist: (next: PresetSnapshotV2[]) => boolean,
  selected: PresetSnapshotV2 | null,
): () => void {
  return useCallback(() => {
    if (!selected) return
    const next = state.library.filter((item) => item.id !== selected.id)
    if (!persist(next)) return
    state.setDeletedSnapshot(selected)
    feedback.resetUndoTimer(() => state.setDeletedSnapshot(null))
    const replacement = next[0]
    state.setSelectedLibraryId(replacement?.id ?? '')
    state.setPresetName(replacement?.name ?? DEFAULT_PRESET_NAME)
    feedback.setSaveStatusTimed('deleted')
  }, [feedback, persist, selected, state])
}

function useUndoDelete(
  state: PresetLibraryState,
  feedback: PresetFeedback,
  persist: (next: PresetSnapshotV2[]) => boolean,
): () => void {
  return useCallback(() => {
    if (!state.deletedSnapshot) return
    if (!persist([state.deletedSnapshot, ...state.library])) return
    state.setSelectedLibraryId(state.deletedSnapshot.id)
    state.setPresetName(state.deletedSnapshot.name)
    state.setDeletedSnapshot(null)
    feedback.clearUndoTimer()
    feedback.setSaveStatusTimed('saved')
  }, [feedback, persist, state])
}
