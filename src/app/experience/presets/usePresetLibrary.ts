import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { logger } from '../../../platform/logger'
import { copyTextToClipboard } from './clipboard'
import {
  createPresetSnapshot,
  decodePresetFromHash,
  DEFAULT_PRESET_NAME,
  encodePresetToHash,
  type PresetPayload,
  type PresetSnapshotV2,
} from './format'
import { loadPresetLibrary, persistPresetLibrary } from './storage'

export type CopyStatus = 'idle' | 'copied' | 'failed'
export type CopyAction = 'configuration' | 'share-link'
export type SaveStatus = 'idle' | 'saved' | 'deleted' | 'loaded'

interface PresetLibraryState {
  library: PresetSnapshotV2[]
  deletedSnapshot: PresetSnapshotV2 | null
  libraryWarning: string | null
  selectedLibraryId: string
  presetName: string
  copyStatus: CopyStatus
  copyAction: CopyAction
  saveStatus: SaveStatus
}

const initialState: PresetLibraryState = {
  library: [],
  deletedSnapshot: null,
  libraryWarning: null,
  selectedLibraryId: '',
  presetName: DEFAULT_PRESET_NAME,
  copyStatus: 'idle',
  copyAction: 'configuration',
  saveStatus: 'idle',
}

type Patch = (partial: Partial<PresetLibraryState>) => void

export interface UsePresetLibraryOptions {
  currentPayload: PresetPayload
  /** Applies a loaded/shared payload; the caller composes settings.apply + forcing sound off. */
  onApply: (payload: PresetPayload) => void
}

function useTimedFeedback(patch: Patch) {
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (undoTimer.current) clearTimeout(undoTimer.current)
    },
    [],
  )
  const setCopyStatusTimed = useCallback(
    (status: Exclude<CopyStatus, 'idle'>, action: CopyAction) => {
      patch({ copyAction: action, copyStatus: status })
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => patch({ copyStatus: 'idle' }), 2000)
    },
    [patch],
  )
  const setSaveStatusTimed = useCallback(
    (status: Exclude<SaveStatus, 'idle'>) => {
      patch({ saveStatus: status })
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => patch({ saveStatus: 'idle' }), 2000)
    },
    [patch],
  )
  const resetUndoTimer = useCallback((callback: () => void) => {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(callback, 8000)
  }, [])
  const clearUndoTimer = useCallback(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current)
  }, [])
  return { setCopyStatusTimed, setSaveStatusTimed, resetUndoTimer, clearUndoTimer }
}

type Feedback = ReturnType<typeof useTimedFeedback>

function useLoadStoredLibrary(patch: Patch): void {
  useEffect(() => {
    try {
      const loaded = loadPresetLibrary()
      const selected = loaded.snapshots[0]
      patch({
        library: loaded.snapshots,
        libraryWarning: loaded.warning,
        ...(selected ? { selectedLibraryId: selected.id, presetName: selected.name } : {}),
      })
    } catch (error) {
      logger.warn('ExperienceComposerPanel preset library load failed', error)
      patch({ library: [] })
    }
    // Runs once per mount; patch is a stable setState-derived callback.
  }, [patch])
}

function useSharedPresetHashImport(
  onApply: (payload: PresetPayload) => void,
  setSaveStatusTimed: Feedback['setSaveStatusTimed'],
): void {
  const consumed = useRef(false)
  useEffect(() => {
    if (consumed.current) return
    consumed.current = true
    const decoded = decodePresetFromHash(window.location.hash)
    if (!decoded.ok) return
    onApply(decoded.payload)
    setSaveStatusTimed('loaded')
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}`,
    )
  }, [onApply, setSaveStatusTimed])
}

function persistAndSet(patch: Patch, next: PresetSnapshotV2[]): boolean {
  if (!persistPresetLibrary(next)) {
    patch({
      libraryWarning:
        'Saved setups could not be updated. Browser storage may be unavailable or full.',
    })
    return false
  }
  patch({ library: next, libraryWarning: null })
  return true
}

function nowIso(): string {
  return new Date().toISOString()
}

interface ActionDeps {
  state: PresetLibraryState
  patch: Patch
  feedback: Feedback
  currentPayload: PresetPayload
  onApply: (payload: PresetPayload) => void
  selectedSnapshot: PresetSnapshotV2 | null
}

function useSaveActions({ state, patch, feedback, currentPayload, selectedSnapshot }: ActionDeps) {
  const onSave = useCallback(() => {
    const snapshot = createPresetSnapshot(currentPayload, {
      name: state.presetName,
      createdAt: nowIso(),
    })
    const next = [snapshot, ...state.library.filter((item) => item.id !== snapshot.id)].slice(0, 30)
    if (!persistAndSet(patch, next)) return
    patch({ selectedLibraryId: snapshot.id, presetName: snapshot.name })
    feedback.setSaveStatusTimed('saved')
  }, [currentPayload, feedback, patch, state.library, state.presetName])

  const onUpdate = useCallback(() => {
    if (!selectedSnapshot) return
    const updated = {
      ...selectedSnapshot,
      name: state.presetName.trim() || selectedSnapshot.name,
      createdAt: nowIso(),
      payload: currentPayload,
    }
    const next = state.library.map((item) => (item.id === selectedSnapshot.id ? updated : item))
    if (!persistAndSet(patch, next)) return
    feedback.setSaveStatusTimed('saved')
  }, [currentPayload, feedback, patch, selectedSnapshot, state.library, state.presetName])

  return { onSave, onUpdate }
}

function useDeleteActions({ state, patch, feedback, selectedSnapshot }: ActionDeps) {
  const onDelete = useCallback(() => {
    if (!selectedSnapshot) return
    const next = state.library.filter((item) => item.id !== selectedSnapshot.id)
    if (!persistAndSet(patch, next)) return
    patch({ deletedSnapshot: selectedSnapshot })
    feedback.resetUndoTimer(() => patch({ deletedSnapshot: null }))
    const replacement = next[0]
    patch({
      selectedLibraryId: replacement?.id ?? '',
      presetName: replacement?.name ?? DEFAULT_PRESET_NAME,
    })
    feedback.setSaveStatusTimed('deleted')
  }, [feedback, patch, selectedSnapshot, state.library])

  const onUndoDelete = useCallback(() => {
    if (!state.deletedSnapshot) return
    const next = [state.deletedSnapshot, ...state.library]
    if (!persistAndSet(patch, next)) return
    patch({
      selectedLibraryId: state.deletedSnapshot.id,
      presetName: state.deletedSnapshot.name,
      deletedSnapshot: null,
    })
    feedback.clearUndoTimer()
    feedback.setSaveStatusTimed('saved')
  }, [feedback, patch, state.deletedSnapshot, state.library])

  return { onDelete, onUndoDelete }
}

function useShareActions({ feedback, currentPayload }: ActionDeps) {
  const onCopyConfiguration = useCallback(async () => {
    const copied = await copyTextToClipboard(JSON.stringify(currentPayload, null, 2))
    feedback.setCopyStatusTimed(copied ? 'copied' : 'failed', 'configuration')
  }, [currentPayload, feedback])
  const onCopyShareLink = useCallback(async () => {
    const hash = encodePresetToHash(currentPayload)
    const copied = await copyTextToClipboard(
      `${window.location.origin}${window.location.pathname}${hash}`,
    )
    feedback.setCopyStatusTimed(copied ? 'copied' : 'failed', 'share-link')
  }, [currentPayload, feedback])
  return { onCopyConfiguration, onCopyShareLink }
}

function useSelectionActions({ state, patch, feedback, onApply, selectedSnapshot }: ActionDeps) {
  const onSelectionChange = useCallback(
    (id: string) => {
      patch({ selectedLibraryId: id })
      const selected = state.library.find((item) => item.id === id)
      if (selected) patch({ presetName: selected.name })
    },
    [patch, state.library],
  )
  const onLoad = useCallback(() => {
    if (!selectedSnapshot) return
    onApply(selectedSnapshot.payload)
    feedback.setSaveStatusTimed('loaded')
  }, [feedback, onApply, selectedSnapshot])
  return { onSelectionChange, onLoad }
}

/** One state object (instead of split state/feedback/action micro-hooks) for the preset library feature. */
export function usePresetLibrary({ currentPayload, onApply }: UsePresetLibraryOptions) {
  const [state, setState] = useState<PresetLibraryState>(initialState)
  const patch = useCallback<Patch>((partial) => setState((prev) => ({ ...prev, ...partial })), [])
  const feedback = useTimedFeedback(patch)
  useLoadStoredLibrary(patch)
  useSharedPresetHashImport(onApply, feedback.setSaveStatusTimed)

  const selectedSnapshot = useMemo(
    () => state.library.find((item) => item.id === state.selectedLibraryId) ?? null,
    [state.library, state.selectedLibraryId],
  )
  const deps: ActionDeps = { state, patch, feedback, currentPayload, onApply, selectedSnapshot }
  const { onSave, onUpdate } = useSaveActions(deps)
  const { onDelete, onUndoDelete } = useDeleteActions(deps)
  const { onCopyConfiguration, onCopyShareLink } = useShareActions(deps)
  const { onSelectionChange, onLoad } = useSelectionActions(deps)
  const onNameChange = useCallback((name: string) => patch({ presetName: name }), [patch])

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
    onNameChange,
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
