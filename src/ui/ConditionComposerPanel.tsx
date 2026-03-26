import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConditionPicker } from './ConditionPicker'
import type { CatalogEntry } from '../conditions/schema'
import { loadProfile } from '../conditions/loader'
import { getExperienceDimensions, type ExperienceDimensionDef, type ComposerMode, type SelectedDimension, type SelectedPreset } from '../composer'
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
  parsePresetLibrary,
  type PresetPayload,
  type PresetSnapshotV2,
} from './presetSnapshot'
import { decodePresetFromHash, encodePresetToHash } from './presetShare'
import './ConditionComposerPanel.css'

export type QuickPreset = 'calm' | 'balanced' | 'intense'

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
  micEnabled: boolean
  onMicEnabledChange: (v: boolean) => void
  micRequiresAudio: boolean
  micRequiresAudioHint?: string

  couplingStrength: number
  onCouplingStrengthChange: (v: number) => void
  maxFeedback: number
  onMaxFeedbackChange: (v: number) => void
  interactionAmount: number
  onInteractionAmountChange: (v: number) => void

  debugOverlay: boolean
  onDebugOverlayChange: (v: boolean) => void

  onQuickPreset: (p: QuickPreset) => void

  onOpenEvidence: (docPath: EvidenceDocPath) => void
}

import { strengthBadge, EvidenceButton } from './composerUtils'
import { MultimorbidPresetList } from './MultimorbidPresetList'
import { SymptomDimensionList } from './SymptomDimensionList'
import { LabeledSlider } from './controls/LabeledSlider'
import { ToggleField } from './controls/ToggleField'

function nowIso(): string {
  return new Date().toISOString()
}

function toCurrentPayload(props: ConditionComposerPanelProps): PresetPayload {
  return createPresetPayload({
    mode: props.mode,
    conditionId: props.conditionId,
    presets: props.presets,
    dimensions: props.dimensions,
    intensity: props.intensity,
    safeMode: props.safeMode,
    reducedMotion: props.reducedMotion,
    audioEnabled: props.audioEnabled,
    couplingStrength: props.couplingStrength,
    maxFeedback: props.maxFeedback,
    interactionAmount: props.interactionAmount,
  })
}

function applyPayload(props: ConditionComposerPanelProps, payload: PresetPayload): void {
  applyPresetPayload(payload, {
    onModeChange: props.onModeChange,
    onConditionIdChange: props.onConditionIdChange,
    onPresetsChange: props.onPresetsChange,
    onDimensionsChange: props.onDimensionsChange,
    onIntensityChange: props.onIntensityChange,
    onSafeModeChange: props.onSafeModeChange,
    onReducedMotionChange: props.onReducedMotionChange,
    onAudioEnabledChange: props.onAudioEnabledChange,
    onCouplingStrengthChange: props.onCouplingStrengthChange,
    onMaxFeedbackChange: props.onMaxFeedbackChange,
    onInteractionAmountChange: props.onInteractionAmountChange,
  })
}

export function ConditionComposerPanel(props: ConditionComposerPanelProps) {
  const dims = useMemo(() => getExperienceDimensions(), [])
  const dimById = useMemo(() => new Map<string, ExperienceDimensionDef>(dims.map((d) => [d.id, d])), [dims])

  const [conditionStrength, setConditionStrength] = useState<Record<string, string>>({})
  const [conditionQuery, setConditionQuery] = useState('')
  const [dimensionQuery, setDimensionQuery] = useState('')

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'deleted' | 'loaded'>('idle')
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const setCopyStatusTimed = useCallback((status: 'copied' | 'failed') => {
    setCopyStatus(status)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopyStatus('idle'), 2000)
  }, [])

  const setSaveStatusTimed = useCallback((status: 'saved' | 'deleted' | 'loaded') => {
    setSaveStatus(status)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }, [])

  const [library, setLibrary] = useState<PresetSnapshotV2[]>([])
  const [selectedLibraryId, setSelectedLibraryId] = useState('')
  const [presetName, setPresetName] = useState(DEFAULT_PRESET_NAME)

  const catalogIds = useMemo(() => (props.catalog ?? []).map((c) => c.id), [props.catalog])
  useAsyncEffect(
    async (ctx) => {
      const out: Record<string, string> = {}
      for (const id of catalogIds) {
        const prof = await loadProfile(id)
        const dimsList = Array.isArray(prof?.experience_dimensions)
          ? prof.experience_dimensions
          : []
        // Conservative aggregation: hypothesis > low > medium > high.
        let rank = 0 // 0=unknown,1=high,2=med,3=low,4=hyp
        for (const d of dimsList) {
          const s = String(dimById.get(String(d?.id))?.evidence_strength ?? '').toLowerCase()
          const r = s === 'hypothesis' ? 4 : s === 'low' ? 3 : s === 'medium' ? 2 : s === 'high' ? 1 : 0
          rank = Math.max(rank, r)
        }
        out[id] = rank === 4 ? 'hypothesis' : rank === 3 ? 'low' : rank === 2 ? 'medium' : rank === 1 ? 'high' : ''
      }
      if (ctx.cancelled) return
      setConditionStrength(out)
    },
    [catalogIds, dimById],
    { onError: (err) => logger.error('ConditionComposerPanel loadProfile failed', err) }
  )

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESET_LIBRARY_STORAGE_KEY)
      const parsed = raw ? parsePresetLibrary(raw) : []

      if (parsed.length === 0) {
        const legacyRaw = localStorage.getItem(LEGACY_PRESET_STORAGE_KEY)
        if (legacyRaw) {
          const legacyParsed = migrateLegacyPresetPayload(JSON.parse(legacyRaw))
          if (legacyParsed) {
            const migrated = createPresetSnapshot(legacyParsed, {
              name: 'Migrated Preset',
              createdAt: nowIso(),
            })
            const next = [migrated]
            localStorage.setItem(PRESET_LIBRARY_STORAGE_KEY, JSON.stringify(next))
            localStorage.removeItem(LEGACY_PRESET_STORAGE_KEY)
            setLibrary(next)
            setSelectedLibraryId(migrated.id)
            setPresetName(migrated.name)
            return
          }
        }
      }

      setLibrary(parsed)
      if (parsed.length > 0) {
        setSelectedLibraryId(parsed[0].id)
        setPresetName(parsed[0].name)
      }
    } catch (err) {
      logger.warn('ConditionComposerPanel preset library load failed', err)
      setLibrary([])
    }
  }, [])

  useEffect(() => {
    const decoded = decodePresetFromHash(window.location.hash)
    if (!decoded.ok) return
    applyPayload(props, decoded.payload)
    setSaveStatusTimed('loaded')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props, setSaveStatusTimed])

  const filteredCatalog = useMemo(() => {
    const q = conditionQuery.trim().toLowerCase()
    const all = props.catalog ?? []
    if (!q) return all
    const next = all.filter((entry) => {
      const hay = `${entry.label} ${entry.description ?? ''} ${entry.id} ${(entry.tags ?? []).join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
    if (!next.some((entry) => entry.id === props.conditionId)) {
      const selected = all.find((entry) => entry.id === props.conditionId)
      if (selected) next.unshift(selected)
    }
    return next
  }, [props.catalog, conditionQuery, props.conditionId])

  const filteredDims = useMemo(() => {
    const q = dimensionQuery.trim().toLowerCase()
    if (!q) return dims
    return dims.filter((entry) => {
      const hay = `${entry.label} ${entry.description ?? ''} ${entry.id}`.toLowerCase()
      return hay.includes(q)
    })
  }, [dims, dimensionQuery])

  const currentPayload = toCurrentPayload(props)
  const presetIds = new Set(props.presets.map((p) => p.profileId))
  const dimIds = new Set(props.dimensions.map((d) => d.dimensionId))
  const currentConditionBadge = strengthBadge(conditionStrength[props.conditionId])

  const selectedSnapshot = useMemo(
    () => library.find((item) => item.id === selectedLibraryId) ?? null,
    [library, selectedLibraryId]
  )

  const persistLibrary = (next: PresetSnapshotV2[]): void => {
    setLibrary(next)
    try {
      localStorage.setItem(PRESET_LIBRARY_STORAGE_KEY, JSON.stringify(next))
    } catch (err) {
      logger.warn('Failed to persist preset library (storage quota may be exceeded)', err)
    }
  }

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(JSON.stringify(currentPayload, null, 2))
    setCopyStatusTimed(ok ? 'copied' : 'failed')
  }

  const handleCopyShareLink = async () => {
    const hash = encodePresetToHash(currentPayload)
    const url = `${window.location.origin}${window.location.pathname}${hash}`
    const ok = await copyTextToClipboard(url)
    setCopyStatusTimed(ok ? 'copied' : 'failed')
  }

  const handleSaveLocal = () => {
    const snapshot = createPresetSnapshot(currentPayload, {
      name: presetName,
      createdAt: nowIso(),
    })
    const next = [snapshot, ...library.filter((item) => item.id !== snapshot.id)].slice(0, 30)
    persistLibrary(next)
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
    persistLibrary(next)
    setSaveStatusTimed('saved')
  }

  const handleDeleteLocal = () => {
    if (!selectedSnapshot) return
    const next = library.filter((item) => item.id !== selectedSnapshot.id)
    persistLibrary(next)
    const newSelected = next[0]
    setSelectedLibraryId(newSelected?.id ?? '')
    setPresetName(newSelected?.name ?? DEFAULT_PRESET_NAME)
    setSaveStatusTimed('deleted')
  }

  const handleLoadLocal = () => {
    if (!selectedSnapshot) return
    applyPayload(props, selectedSnapshot.payload)
    setSaveStatusTimed('loaded')
  }

  return (
    <section className="composer" aria-label="Experience settings">
      <div className="composer__header">
        <div className="composer__title">Mode</div>
        <div className="composer__mode">
          {(
            [
              { id: 'preset', label: 'Preset' },
              { id: 'multimorbid', label: 'Multimorbid' },
              { id: 'symptom', label: 'Symptom-first' },
            ] as const
          ).map((m) => (
            <label key={m.id} className="composer__toggle">
              <input
                type="radio"
                name="composer-mode"
                checked={props.mode === m.id}
                onChange={() => props.onModeChange(m.id)}
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="composer__quick">
        <div className="composer__title">Presets</div>
        <div className="composer__quick-buttons">
          <button type="button" onClick={() => props.onQuickPreset('calm')}>
            Calm
          </button>
          <button type="button" onClick={() => props.onQuickPreset('balanced')}>
            Balanced
          </button>
          <button type="button" onClick={() => props.onQuickPreset('intense')}>
            Intense
          </button>
        </div>
      </div>

      <div className="composer__global" role="group" aria-label="Global settings">
        <LabeledSlider
          label="Intensity"
          min={0}
          max={1}
          step={0.01}
          value={props.intensity}
          onChange={props.onIntensityChange}
        />

        <div className="composer__toggles">
          <ToggleField label="Safe Mode" checked={props.safeMode} onChange={props.onSafeModeChange} />
          <ToggleField
            label="Reduced Motion"
            checked={props.reducedMotion}
            onChange={props.onReducedMotionChange}
          />
          <ToggleField
            label="Audio (optional)"
            checked={props.audioEnabled}
            onChange={props.onAudioEnabledChange}
          />
          <ToggleField
            label="Microphone (optional)"
            checked={props.micEnabled}
            disabled={props.micRequiresAudio}
            onChange={props.onMicEnabledChange}
          />
        </div>
        {props.micRequiresAudio && (
          <p className="composer__micPrereqHint">
            {props.micRequiresAudioHint ?? 'Enable audio first to enable microphone (optional).'}
          </p>
        )}
      </div>

      <details className="composer__advanced">
        <summary>Advanced coupling</summary>
        <div className="composer__advanced-body">
          <LabeledSlider
            label="Coupling Strength"
            min={0}
            max={1}
            step={0.01}
            value={props.couplingStrength}
            onChange={props.onCouplingStrengthChange}
          />
          <LabeledSlider
            label="Max Feedback"
            min={0}
            max={1}
            step={0.01}
            value={props.maxFeedback}
            onChange={props.onMaxFeedbackChange}
          />
          <LabeledSlider
            label="Interaction Amount"
            min={0}
            max={1}
            step={0.01}
            value={props.interactionAmount}
            onChange={props.onInteractionAmountChange}
          />
          <p className="composer__hint">
            These settings shape how elements of the experience interact with each other. Safety limits are always active to keep things comfortable.
          </p>
        </div>
      </details>

      <details className="composer__advanced">
        <summary>Preset Library v2</summary>
        <div className="composer__advanced-body">
          <label className="composer__slider">
            <span>Name</span>
            <input
              type="text"
              value={presetName}
              maxLength={200}
              onChange={(e) => setPresetName(e.target.value)}
              aria-label="Preset name"
            />
            <span className="composer__slider-val">v2</span>
          </label>

          <label className="composer__slider">
            <span>Saved presets</span>
            <select
              value={selectedLibraryId}
              onChange={(e) => {
                setSelectedLibraryId(e.target.value)
                const selected = library.find((item) => item.id === e.target.value)
                if (selected) setPresetName(selected.name)
              }}
              aria-label="Saved presets"
            >
              <option value="">(none)</option>
              {library.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {new Date(item.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
            <span className="composer__slider-val">{library.length}</span>
          </label>

          <div className="composer__quick-buttons">
            <button type="button" onClick={handleSaveLocal}>
              Save new
            </button>
            <button type="button" onClick={handleOverwriteLocal} disabled={!selectedSnapshot}>
              Overwrite
            </button>
            <button type="button" onClick={handleLoadLocal} disabled={!selectedSnapshot}>
              Load
            </button>
            <button type="button" onClick={handleDeleteLocal} disabled={!selectedSnapshot}>
              Delete
            </button>
            <button type="button" onClick={handleCopy}>
              {copyStatus === 'copied' ? 'Copied JSON!' : copyStatus === 'failed' ? 'Failed' : 'Copy JSON'}
            </button>
            <button type="button" onClick={handleCopyShareLink}>
              Share Link
            </button>
          </div>

          {saveStatus !== 'idle' && (
            <p className="composer__hint" role="status">
              {saveStatus === 'saved' && 'Preset saved.'}
              {saveStatus === 'loaded' && 'Preset loaded.'}
              {saveStatus === 'deleted' && 'Preset deleted.'}
            </p>
          )}
        </div>
      </details>

      {(props.mode === 'preset' || props.mode === 'multimorbid') && (
        <label className="composer__slider">
          <span>Filter</span>
          <input
            type="text"
            value={conditionQuery}
            placeholder="Search experiences"
            onChange={(e) => setConditionQuery(e.target.value)}
            aria-label="Experience search"
          />
          <span className="composer__slider-val">{filteredCatalog.length}</span>
        </label>
      )}

      {props.mode === 'preset' && (
        <div className="composer__section">
          <div className="composer__title">Preset</div>
          <ConditionPicker
            catalog={filteredCatalog}
            value={props.conditionId}
            onChange={props.onConditionIdChange}
            aria-label="Condition preset"
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
              onChange={(e) => setDimensionQuery(e.target.value)}
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
        </>
      )}
    </section>
  )
}
