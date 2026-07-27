import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConditionPicker } from './ConditionPicker'
import type { CatalogEntry } from '../conditions/schema'
import { loadProfile } from '../conditions/loader'
import {
  getExperienceDimensions,
  type ExperienceDimensionDef,
  type ComposerMode,
  type SelectedDimension,
  type SelectedPreset,
} from '../composer'
import type { EvidenceDocPath } from '../evidence/docs'
import { copyTextToClipboard } from './clipboard'
import { useAsyncEffect } from './hooks/useAsyncEffect'
import { logger } from '../utils/logger'
import {
  DEFAULT_PRESET_NAME,
  LEGACY_PRESET_STORAGE_KEY,
  PRESET_LIBRARY_STORAGE_KEY,
  applyPresetPayload,
  createPresetPayload,
  createPresetSnapshot,
  migrateLegacyPresetPayload,
  type ApplyPresetPayloadCallbacks,
  parsePresetLibraryWithDiagnostics,
  type PresetPayload,
  type PresetSnapshotV2,
} from './presetSnapshot'
import { decodePresetFromHash, encodePresetToHash } from './presetShare'
import './ConditionComposerPanel.css'

export interface ConditionComposerPanelProps {
  catalog: CatalogEntry[] | null

  mode: ComposerMode
  onModeChange: (mode: ComposerMode) => void

  // Preset mode (single)
  conditionId: string
  onConditionIdChange: (id: string) => void

  // Multimorbid mode (multi presets)
  presets: SelectedPreset[]
  onPresetsChange: (next: SelectedPreset[]) => void

  // Symptom mode (dimensions)
  dimensions: SelectedDimension[]
  onDimensionsChange: (next: SelectedDimension[]) => void

  // Global settings
  intensity: number
  onIntensityChange: (v: number) => void
  safeMode: boolean
  onSafeModeChange: (v: boolean) => void
  reducedMotion: boolean
  onReducedMotionChange: (v: boolean) => void

  audioEnabled: boolean
  onAudioEnabledChange: (v: boolean) => void
  couplingStrength: number
  onCouplingStrengthChange: (v: number) => void
  maxFeedback: number
  onMaxFeedbackChange: (v: number) => void
  interactionAmount: number
  onInteractionAmountChange: (v: number) => void

  onOpenEvidence: (docPath: EvidenceDocPath) => void
  variant?: 'setup' | 'compact'
  cameraRequesting?: boolean
  onStartCamera?: () => void
}

import { strengthBadge, EvidenceButton } from './composerUtils'
import { MultimorbidPresetList } from './MultimorbidPresetList'
import { SymptomDimensionList } from './SymptomDimensionList'
import { AdvancedComposerPanel } from './AdvancedComposerPanel'
import { PresetLibraryPanel } from './PresetLibraryPanel'
import { filterCatalog } from './composerCatalog'
import { CompositionMap } from './CompositionMap'

function nowIso(): string {
  return new Date().toISOString()
}

interface LoadedPresetLibrary {
  snapshots: PresetSnapshotV2[]
  warning: string | null
}

const PRESET_LIBRARY_PARSE_WARNING =
  'Saved preset library could not be read completely. Existing storage was left unchanged.'
const LEGACY_PRESET_MIGRATION_WARNING =
  'Legacy preset storage could not be migrated. Existing storage was left unchanged.'

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

function applyPayload(callbacks: ApplyPresetPayloadCallbacks, payload: PresetPayload): void {
  applyPresetPayload(payload, callbacks)
}

function evidenceStrengthRank(value: unknown): number {
  return { high: 1, medium: 2, low: 3, hypothesis: 4 }[String(value).toLowerCase()] ?? 0
}

function profileStrength(
  profile: Awaited<ReturnType<typeof loadProfile>>,
  dimById: Map<string, ExperienceDimensionDef>,
): string {
  let rank = 0
  for (const dimension of profile?.experience_dimensions ?? []) {
    rank = Math.max(rank, evidenceStrengthRank(dimById.get(dimension.id)?.evidence_strength))
  }
  return ['', 'high', 'medium', 'low', 'hypothesis'][rank] ?? ''
}

async function loadConditionStrengths(
  catalogIds: string[],
  dimById: Map<string, ExperienceDimensionDef>,
): Promise<Record<string, string>> {
  const profiles = await Promise.all(catalogIds.map((id) => loadProfile(id)))
  return Object.fromEntries(
    catalogIds.map((id, index) => [id, profileStrength(profiles[index], dimById)]),
  )
}

export function ConditionComposerPanel(props: ConditionComposerPanelProps) {
  const {
    mode,
    conditionId,
    presets,
    dimensions,
    intensity,
    safeMode,
    reducedMotion,
    audioEnabled,
    couplingStrength,
    maxFeedback,
    interactionAmount,
    onModeChange,
    onConditionIdChange,
    onPresetsChange,
    onDimensionsChange,
    onIntensityChange,
    onSafeModeChange,
    onReducedMotionChange,
    onAudioEnabledChange,
    onCouplingStrengthChange,
    onMaxFeedbackChange,
    onInteractionAmountChange,
  } = props

  const payloadCallbacks = useMemo<ApplyPresetPayloadCallbacks>(
    () => ({
      onModeChange,
      onConditionIdChange,
      onPresetsChange,
      onDimensionsChange,
      onIntensityChange,
      onSafeModeChange,
      onReducedMotionChange,
      onAudioEnabledChange,
      onCouplingStrengthChange,
      onMaxFeedbackChange,
      onInteractionAmountChange,
    }),
    [
      onModeChange,
      onConditionIdChange,
      onPresetsChange,
      onDimensionsChange,
      onIntensityChange,
      onSafeModeChange,
      onReducedMotionChange,
      onAudioEnabledChange,
      onCouplingStrengthChange,
      onMaxFeedbackChange,
      onInteractionAmountChange,
    ],
  )

  const dims = useMemo(() => getExperienceDimensions(), [])
  const dimById = useMemo(
    () => new Map<string, ExperienceDimensionDef>(dims.map((d) => [d.id, d])),
    [dims],
  )

  const [conditionStrength, setConditionStrength] = useState<Record<string, string>>({})
  const [conditionQuery, setConditionQuery] = useState('')
  const [dimensionQuery, setDimensionQuery] = useState('')

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [copyAction, setCopyAction] = useState<'configuration' | 'share-link'>('configuration')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'deleted' | 'loaded'>('idle')
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const [library, setLibrary] = useState<PresetSnapshotV2[]>([])
  const [deletedSnapshot, setDeletedSnapshot] = useState<PresetSnapshotV2 | null>(null)
  const [libraryWarning, setLibraryWarning] = useState<string | null>(null)
  const [selectedLibraryId, setSelectedLibraryId] = useState('')
  const [presetName, setPresetName] = useState(DEFAULT_PRESET_NAME)
  const consumedSharedHashRef = useRef(false)

  const catalogIds = useMemo(() => (props.catalog ?? []).map((c) => c.id), [props.catalog])
  useAsyncEffect(
    async (ctx) => {
      const strengths = await loadConditionStrengths(catalogIds, dimById)
      if (ctx.cancelled) return
      setConditionStrength(strengths)
    },
    [catalogIds, dimById],
    { onError: (err) => logger.error('ConditionComposerPanel loadProfile failed', err) },
  )

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
      logger.warn('ConditionComposerPanel preset library load failed', err)
      setLibrary([])
    }
  }, [])

  useEffect(() => {
    if (consumedSharedHashRef.current) return
    consumedSharedHashRef.current = true

    const decoded = decodePresetFromHash(window.location.hash)
    if (!decoded.ok) return

    // Shared links are not a user gesture; keep audio opt-in after import.
    const sharedPayload: PresetPayload = {
      ...decoded.payload,
      audioEnabled: false,
    }

    applyPayload(payloadCallbacks, sharedPayload)
    setSaveStatusTimed('loaded')

    const clearedUrl = `${window.location.pathname}${window.location.search}`
    window.history.replaceState(window.history.state, '', clearedUrl)
  }, [payloadCallbacks, setSaveStatusTimed])

  const filteredCatalog = useMemo(
    () => filterCatalog(props.catalog, props.conditionId, conditionQuery),
    [props.catalog, conditionQuery, props.conditionId],
  )

  const filteredDims = useMemo(() => {
    const q = dimensionQuery.trim().toLowerCase()
    if (!q) return dims
    return dims.filter((entry) => {
      const hay = `${entry.label} ${entry.description ?? ''} ${entry.id}`.toLowerCase()
      return hay.includes(q)
    })
  }, [dims, dimensionQuery])

  const currentPayload = useMemo(
    () =>
      createPresetPayload({
        mode,
        conditionId,
        presets,
        dimensions,
        intensity,
        safeMode,
        reducedMotion,
        audioEnabled,
        couplingStrength,
        maxFeedback,
        interactionAmount,
      }),
    [
      mode,
      conditionId,
      presets,
      dimensions,
      intensity,
      safeMode,
      reducedMotion,
      audioEnabled,
      couplingStrength,
      maxFeedback,
      interactionAmount,
    ],
  )
  const presetIds = new Set(props.presets.map((p) => p.profileId))
  const dimIds = new Set(props.dimensions.map((d) => d.dimensionId))
  const currentConditionBadge = strengthBadge(conditionStrength[props.conditionId])

  const selectedSnapshot = useMemo(
    () => library.find((item) => item.id === selectedLibraryId) ?? null,
    [library, selectedLibraryId],
  )

  const persistLibrary = (next: PresetSnapshotV2[]): boolean => {
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
  }

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(JSON.stringify(currentPayload, null, 2))
    setCopyStatusTimed(ok ? 'copied' : 'failed', 'configuration')
  }

  const handleCopyShareLink = async () => {
    const hash = encodePresetToHash(currentPayload)
    const url = `${window.location.origin}${window.location.pathname}${hash}`
    const ok = await copyTextToClipboard(url)
    setCopyStatusTimed(ok ? 'copied' : 'failed', 'share-link')
  }

  const handleSaveLocal = () => {
    const snapshot = createPresetSnapshot(currentPayload, {
      name: presetName,
      createdAt: nowIso(),
    })
    const next = [snapshot, ...library.filter((item) => item.id !== snapshot.id)].slice(0, 30)
    if (!persistLibrary(next)) return
    setSelectedLibraryId(snapshot.id)
    setPresetName(snapshot.name)
    setSaveStatusTimed('saved')
  }

  const handleOverwriteLocal = () => {
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
  }

  const handleDeleteLocal = () => {
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
  }

  const handleUndoDelete = () => {
    if (!deletedSnapshot) return
    if (!persistLibrary([deletedSnapshot, ...library])) return
    setSelectedLibraryId(deletedSnapshot.id)
    setPresetName(deletedSnapshot.name)
    setDeletedSnapshot(null)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setSaveStatusTimed('saved')
  }

  const handleLoadLocal = () => {
    if (!selectedSnapshot) return
    applyPayload(payloadCallbacks, selectedSnapshot.payload)
    setSaveStatusTimed('loaded')
  }

  return (
    <section
      className={`composer composer--${props.variant ?? 'setup'}`}
      aria-label="Experience settings"
    >
      <div className="composer__header">
        <div>
          <div className="composer__eyebrow">Setup / Experience</div>
          <h2 className="composer__heading">Shape the metaphor.</h2>
          <p className="composer__hint">
            Choose patterns to combine into one bounded audiovisual profile.
          </p>
        </div>
      </div>

      <div className="composer__workspace">
        <div className="composer__mode">
          {(
            [
              { id: 'symptom', label: 'Experience dimensions' },
              { id: 'preset', label: 'Curated collections' },
              { id: 'multimorbid', label: 'Combine collections' },
            ] as const
          ).map((mode) => (
            <label key={mode.id} className="composer__toggle">
              <input
                type="radio"
                name="composer-mode"
                checked={props.mode === mode.id}
                onChange={() => props.onModeChange(mode.id)}
              />
              <span>{mode.label}</span>
            </label>
          ))}
        </div>

        <CompositionMap
          mode={props.mode}
          conditionId={props.conditionId}
          dimensions={props.dimensions}
          presets={props.presets}
        />

        <div className="composer__inspector">
          <div className="composer__inspectorHeader">
            <div className="composer__title">
              {props.mode === 'symptom'
                ? 'Experience dimensions'
                : props.mode === 'preset'
                  ? 'Curated collection'
                  : 'Combined collections'}
            </div>
            <p className="composer__hint">Media remains off while you configure this view.</p>
          </div>

          {(props.mode === 'preset' || props.mode === 'multimorbid') && (
            <label className="composer__slider">
              <span>Filter</span>
              <input
                type="text"
                value={conditionQuery}
                placeholder="Search experiences"
                onChange={(event) => setConditionQuery(event.target.value)}
                aria-label="Experience search"
              />
              <span className="composer__slider-val">{filteredCatalog.length}</span>
            </label>
          )}

          {props.mode === 'preset' && (
            <div className="composer__section">
              <ConditionPicker
                catalog={filteredCatalog}
                value={props.conditionId}
                onChange={props.onConditionIdChange}
                aria-label="Curated collection"
              />
              <div className="composer__row-meta">
                {currentConditionBadge && (
                  <span className={currentConditionBadge.className}>
                    {currentConditionBadge.label}
                  </span>
                )}
                <EvidenceButton
                  doc={`docs/references/conditions/${props.conditionId}.md`}
                  onOpen={props.onOpenEvidence}
                />
              </div>
            </div>
          )}

          {props.mode === 'multimorbid' && (
            <MultimorbidPresetList
              catalog={filteredCatalog}
              presetIds={presetIds}
              presets={props.presets}
              conditionStrength={conditionStrength}
              onPresetsChange={props.onPresetsChange}
              onOpenEvidence={props.onOpenEvidence}
            />
          )}

          {props.mode === 'symptom' && (
            <>
              <label className="composer__slider">
                <span>Filter</span>
                <input
                  type="text"
                  value={dimensionQuery}
                  placeholder="Search dimensions"
                  onChange={(event) => setDimensionQuery(event.target.value)}
                  aria-label="Dimension search"
                />
                <span className="composer__slider-val">{filteredDims.length}</span>
              </label>
              <SymptomDimensionList
                dims={filteredDims}
                dimById={dimById}
                dimIds={dimIds}
                dimensions={props.dimensions}
                onDimensionsChange={props.onDimensionsChange}
                onOpenEvidence={props.onOpenEvidence}
              />
              {props.dimensions.length === 0 && (
                <p className="composer__empty" role="status">
                  No dimensions selected. Choose one or more to prepare an audiovisual profile.
                </p>
              )}
            </>
          )}

          <AdvancedComposerPanel
            couplingStrength={props.couplingStrength}
            maxFeedback={props.maxFeedback}
            interactionAmount={props.interactionAmount}
            onCouplingStrengthChange={props.onCouplingStrengthChange}
            onMaxFeedbackChange={props.onMaxFeedbackChange}
            onInteractionAmountChange={props.onInteractionAmountChange}
          />
          <PresetLibraryPanel
            library={library}
            selectedId={selectedLibraryId}
            name={presetName}
            warning={libraryWarning}
            hasSelection={selectedSnapshot != null}
            canUndoDelete={deletedSnapshot != null}
            copyStatus={copyStatus}
            copyAction={copyAction}
            saveStatus={saveStatus}
            onNameChange={setPresetName}
            onSelectionChange={(id) => {
              setSelectedLibraryId(id)
              const selected = library.find((item) => item.id === id)
              if (selected) setPresetName(selected.name)
            }}
            onSave={handleSaveLocal}
            onUpdate={handleOverwriteLocal}
            onLoad={handleLoadLocal}
            onDelete={handleDeleteLocal}
            onCopyConfiguration={() => void handleCopy()}
            onCopyShareLink={() => void handleCopyShareLink()}
            onUndoDelete={handleUndoDelete}
          />

          {props.onStartCamera && (
            <div className="composer__readiness">
              <div>
                <strong>Ready to preview</strong>
                <span>Camera, sound, and microphone remain off.</span>
              </div>
              <button
                type="button"
                className="ie-btn ie-btn--accent"
                onClick={props.onStartCamera}
                disabled={props.cameraRequesting}
                aria-busy={props.cameraRequesting}
              >
                {props.cameraRequesting ? 'Requesting camera…' : 'Start camera'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
