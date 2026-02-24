import { useMemo, useState } from 'react'
import { z } from 'zod'
import { ConditionPicker } from './ConditionPicker'
import type { CatalogEntry } from '../conditions/schema'
import { loadProfile } from '../conditions/loader'
import type { ComposerMode, SelectedDimension, SelectedPreset } from '../composer'
import { getExperienceDimensions, type ExperienceDimensionDef } from '../composer'
import type { EvidenceDocPath } from '../evidence/docs'
import { copyTextToClipboard } from './clipboard'
import { useAsyncEffect } from './hooks/useAsyncEffect'
import './ConditionComposerPanel.css'

const selectedPresetSchema = z.object({
  profileId: z.string(),
  weight: z.number()
})

const selectedDimensionSchema = z.object({
  dimensionId: z.string(),
  weight: z.number()
})

const customPresetDataSchema = z.object({
  mode: z.enum(['preset', 'multimorbid', 'symptom']).optional(),
  conditionId: z.string().optional(),
  presets: z.array(selectedPresetSchema).optional(),
  dimensions: z.array(selectedDimensionSchema).optional(),
  intensity: z.number().optional(),
  safeMode: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  audioEnabled: z.boolean().optional(),
  couplingStrength: z.number().optional(),
  maxFeedback: z.number().optional(),
  interactionAmount: z.number().optional(),
}).passthrough()

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

export function ConditionComposerPanel(props: ConditionComposerPanelProps) {
  const dims = useMemo(() => getExperienceDimensions(), [])
  const dimById = useMemo(() => new Map<string, ExperienceDimensionDef>(dims.map((d) => [d.id, d])), [dims])

  const [conditionStrength, setConditionStrength] = useState<Record<string, string>>({})

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
    { onError: (err) => console.error('ConditionComposerPanel loadProfile failed', err) }
  )

  const presetIds = new Set(props.presets.map((p) => p.profileId))
  const dimIds = new Set(props.dimensions.map((d) => d.dimensionId))
  const currentConditionBadge = strengthBadge(conditionStrength[props.conditionId])

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')

  const handleCopy = async () => {
    const data = {
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
      interactionAmount: props.interactionAmount
    }
    const ok = await copyTextToClipboard(JSON.stringify(data, null, 2))
    setCopyStatus(ok ? 'copied' : 'failed')
    setTimeout(() => setCopyStatus('idle'), 2000)
  }

  const handleSaveLocal = () => {
    const data = {
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
      interactionAmount: props.interactionAmount
    }
    try {
      localStorage.setItem('ie_custom_preset', JSON.stringify(data))
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (e) { }
  }

  const handleLoadLocal = () => {
    try {
      const str = localStorage.getItem('ie_custom_preset')
      if (!str) return
      const raw = JSON.parse(str)
      const parsed = customPresetDataSchema.safeParse(raw)
      if (!parsed.success) {
        console.warn('[composer] Local preset validation failed', parsed.error.flatten())
        return
      }
      const data = parsed.data
      if (data.mode) props.onModeChange(data.mode)
      if (data.conditionId) props.onConditionIdChange(data.conditionId)
      if (data.presets) props.onPresetsChange(data.presets)
      if (data.dimensions) props.onDimensionsChange(data.dimensions)
      if (typeof data.intensity === 'number') props.onIntensityChange(data.intensity)
      if (typeof data.safeMode === 'boolean') props.onSafeModeChange(data.safeMode)
      if (typeof data.reducedMotion === 'boolean') props.onReducedMotionChange(data.reducedMotion)
      if (typeof data.audioEnabled === 'boolean') props.onAudioEnabledChange(data.audioEnabled)
      if (typeof data.couplingStrength === 'number') props.onCouplingStrengthChange(data.couplingStrength)
      if (typeof data.maxFeedback === 'number') props.onMaxFeedbackChange(data.maxFeedback)
      if (typeof data.interactionAmount === 'number') props.onInteractionAmountChange(data.interactionAmount)
    } catch (e) { }
  }

  return (
    <section className="composer" aria-label="Condition Composer">
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
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 8px' }} />
          <button type="button" onClick={handleSaveLocal}>
            {saveStatus === 'saved' ? 'Saved!' : 'Save Local'}
          </button>
          <button type="button" onClick={handleLoadLocal}>
            Load Local
          </button>
          <button type="button" onClick={handleCopy}>
            {copyStatus === 'copied' ? 'Copied JSON!' : copyStatus === 'failed' ? 'Failed' : 'Copy JSON'}
          </button>
        </div>
      </div>

      <div className="composer__global" role="group" aria-label="Global settings">
        <label className="composer__slider">
          <span>Intensity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={props.intensity}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (!Number.isFinite(n)) return
              props.onIntensityChange(n)
            }}
          />
          <span className="composer__slider-val">{Math.round(props.intensity * 100)}%</span>
        </label>

        <div className="composer__toggles">
          <label className="composer__toggle">
            <input type="checkbox" checked={props.safeMode} onChange={(e) => props.onSafeModeChange(e.target.checked)} />
            <span>Safe Mode</span>
          </label>
          <label className="composer__toggle">
            <input
              type="checkbox"
              checked={props.reducedMotion}
              onChange={(e) => props.onReducedMotionChange(e.target.checked)}
            />
            <span>Reduced Motion</span>
          </label>
          <label className="composer__toggle">
            <input
              type="checkbox"
              checked={props.audioEnabled}
              onChange={(e) => props.onAudioEnabledChange(e.target.checked)}
            />
            <span>Audio (optional)</span>
          </label>
          <label className="composer__toggle">
            <input
              type="checkbox"
              checked={props.micEnabled}
              disabled={props.micRequiresAudio}
              onChange={(e) => props.onMicEnabledChange(e.target.checked)}
            />
            <span>Microphone (optional)</span>
          </label>
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
          <label className="composer__slider">
            <span>Coupling Strength</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={props.couplingStrength}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (!Number.isFinite(n)) return
                props.onCouplingStrengthChange(n)
              }}
            />
            <span className="composer__slider-val">{Math.round(props.couplingStrength * 100)}%</span>
          </label>
          <label className="composer__slider">
            <span>Max Feedback</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={props.maxFeedback}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (!Number.isFinite(n)) return
                props.onMaxFeedbackChange(n)
              }}
            />
            <span className="composer__slider-val">{Math.round(props.maxFeedback * 100)}%</span>
          </label>
          <label className="composer__slider">
            <span>Interaction Amount</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={props.interactionAmount}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (!Number.isFinite(n)) return
                props.onInteractionAmountChange(n)
              }}
            />
            <span className="composer__slider-val">{Math.round(props.interactionAmount * 100)}%</span>
          </label>
          <p className="composer__hint">
            Coupling and interactions are a perceptual metaphor. Safety clamps always apply; strobe-like modulation is not
            allowed.
          </p>
        </div>
      </details>

      {props.mode === 'preset' && (
        <div className="composer__section">
          <div className="composer__title">Preset</div>
          <ConditionPicker
            catalog={props.catalog}
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
          catalog={props.catalog ?? []}
          presetIds={presetIds}
          presets={props.presets}
          conditionStrength={conditionStrength}
          onPresetsChange={props.onPresetsChange}
          onOpenEvidence={props.onOpenEvidence}
        />
      )}

      {props.mode === 'symptom' && (
        <SymptomDimensionList
          dims={dims}
          dimById={dimById}
          dimIds={dimIds}
          dimensions={props.dimensions}
          onDimensionsChange={props.onDimensionsChange}
          onOpenEvidence={props.onOpenEvidence}
        />
      )}
    </section>
  )
}
