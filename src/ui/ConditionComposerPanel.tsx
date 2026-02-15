import { useEffect, useMemo, useState } from 'react'
import { ConditionPicker } from './ConditionPicker'
import type { CatalogEntry } from '../conditions/schema'
import { loadProfile } from '../conditions/loader'
import type { ComposerMode, SelectedDimension, SelectedPreset } from '../composer'
import { getExperienceDimensions, type ExperienceDimensionDef } from '../composer'
import type { EvidenceDocPath } from '../evidence/docs'
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

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function upsertPreset(list: SelectedPreset[], profileId: string, weight: number, enabled: boolean): SelectedPreset[] {
  const next = list.slice()
  const idx = next.findIndex((p) => p.profileId === profileId)
  if (!enabled) {
    if (idx >= 0) next.splice(idx, 1)
    return next
  }
  const item: SelectedPreset = { profileId, weight: clamp01(weight) }
  if (idx >= 0) next[idx] = item
  else next.push(item)
  next.sort((a, b) => a.profileId.localeCompare(b.profileId))
  return next
}

function upsertDimension(
  list: SelectedDimension[],
  dimensionId: string,
  weight: number,
  enabled: boolean
): SelectedDimension[] {
  const next = list.slice()
  const idx = next.findIndex((d) => d.dimensionId === dimensionId)
  if (!enabled) {
    if (idx >= 0) next.splice(idx, 1)
    return next
  }
  const item: SelectedDimension = { dimensionId, weight: clamp01(weight) }
  if (idx >= 0) next[idx] = item
  else next.push(item)
  next.sort((a, b) => a.dimensionId.localeCompare(b.dimensionId))
  return next
}

function strengthBadge(strength?: string): { label: string; className: string } | null {
  if (!strength) return null
  const s = String(strength).toLowerCase()
  if (s === 'high') return { label: 'Evidence: high', className: 'composer__badge composer__badge--high' }
  if (s === 'medium') return { label: 'Evidence: medium', className: 'composer__badge composer__badge--medium' }
  if (s === 'low') return { label: 'Evidence: low', className: 'composer__badge composer__badge--low' }
  if (s === 'hypothesis') return { label: 'Hypothesis (evidence gap)', className: 'composer__badge composer__badge--hyp' }
  return { label: `Evidence: ${strength}`, className: 'composer__badge' }
}

function EvidenceButton({ doc, onOpen }: { doc?: string; onOpen: (docPath: EvidenceDocPath) => void }) {
  if (!doc) return null
  return (
    <button
      type="button"
      className="composer__evidenceBtn"
      onClick={() => onOpen(doc as EvidenceDocPath)}
      aria-label={`Open evidence doc ${doc}`}
      title={doc}
    >
      Evidence
    </button>
  )
}

function DimensionRow({
  dim,
  selected,
  weight,
  onToggle,
  onWeight,
  onEvidence,
}: {
  dim: ExperienceDimensionDef
  selected: boolean
  weight: number
  onToggle: (enabled: boolean) => void
  onWeight: (w: number) => void
  onEvidence: (docPath: EvidenceDocPath) => void
}) {
  const badge = strengthBadge(dim.evidence_strength)
  return (
    <div className="composer__row">
      <label className="composer__row-main">
        <input type="checkbox" checked={selected} onChange={(e) => onToggle(e.target.checked)} />
        <span className="composer__row-title">{dim.label ?? dim.id}</span>
        <span className="composer__row-sub">{dim.description}</span>
      </label>
      <div className="composer__row-meta">
        {badge && <span className={badge.className}>{badge.label}</span>}
        <EvidenceButton doc={dim.rationale_doc} onOpen={onEvidence} />
      </div>
      {selected && (
        <label className="composer__slider">
          <span>Weight</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={weight}
            onChange={(e) => onWeight(Number(e.target.value))}
          />
          <span className="composer__slider-val">{Math.round(weight * 100)}%</span>
        </label>
      )}
    </div>
  )
}

export function ConditionComposerPanel(props: ConditionComposerPanelProps) {
  const dims = getExperienceDimensions()
  const dimById = useMemo(() => new Map<string, ExperienceDimensionDef>(dims.map((d) => [d.id, d])), [dims])

  const [conditionStrength, setConditionStrength] = useState<Record<string, string>>({})

  const catalogIds = useMemo(() => (props.catalog ?? []).map((c) => c.id), [props.catalog])
  useEffect(() => {
    let cancelled = false
    async function run() {
      const out: Record<string, string> = {}
      for (const id of catalogIds) {
        const prof = await loadProfile(id)
        const dimsList = (prof as any)?.experience_dimensions ?? []
        // Conservative aggregation: hypothesis > low > medium > high.
        let rank = 0 // 0=unknown,1=high,2=med,3=low,4=hyp
        for (const d of dimsList) {
          const s = String(dimById.get(String(d?.id))?.evidence_strength ?? '').toLowerCase()
          const r = s === 'hypothesis' ? 4 : s === 'low' ? 3 : s === 'medium' ? 2 : s === 'high' ? 1 : 0
          rank = Math.max(rank, r)
        }
        out[id] = rank === 4 ? 'hypothesis' : rank === 3 ? 'low' : rank === 2 ? 'medium' : rank === 1 ? 'high' : ''
      }
      if (cancelled) return
      setConditionStrength(out)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [catalogIds, dimById])

  const presetIds = new Set(props.presets.map((p) => p.profileId))
  const dimIds = new Set(props.dimensions.map((d) => d.dimensionId))

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
        <div className="composer__title">Quick</div>
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
        <label className="composer__slider">
          <span>Intensity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={props.intensity}
            onChange={(e) => props.onIntensityChange(Number(e.target.value))}
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
            <input type="checkbox" checked={props.micEnabled} onChange={(e) => props.onMicEnabledChange(e.target.checked)} />
            <span>Microphone (optional)</span>
          </label>
        </div>
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
              onChange={(e) => props.onCouplingStrengthChange(Number(e.target.value))}
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
              onChange={(e) => props.onMaxFeedbackChange(Number(e.target.value))}
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
              onChange={(e) => props.onInteractionAmountChange(Number(e.target.value))}
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
            {strengthBadge(conditionStrength[props.conditionId]) && (
              <span className={strengthBadge(conditionStrength[props.conditionId])!.className}>
                {strengthBadge(conditionStrength[props.conditionId])!.label}
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
        <div className="composer__section" role="group" aria-label="Multimorbid preset stack">
          <div className="composer__title">Preset stack</div>
          <p className="composer__hint">Combine multiple presets with per-preset weights (metaphor-first, safety-clamped).</p>
          <div className="composer__list">
            {(props.catalog ?? []).map((entry: CatalogEntry) => {
              const enabled = presetIds.has(entry.id)
              const weight = props.presets.find((p) => p.profileId === entry.id)?.weight ?? 0.5
              const badge = strengthBadge(conditionStrength[entry.id])
              return (
                <div key={entry.id} className="composer__row">
                  <label className="composer__row-main">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => props.onPresetsChange(upsertPreset(props.presets, entry.id, weight, e.target.checked))}
                    />
                    <span className="composer__row-title">{entry.label}</span>
                    <span className="composer__row-sub">{entry.description ?? ''}</span>
                  </label>
                  <div className="composer__row-meta">
                    {badge && <span className={badge.className}>{badge.label}</span>}
                    <EvidenceButton
                      doc={`docs/references/conditions/${entry.id}.md`}
                      onOpen={props.onOpenEvidence}
                    />
                  </div>
                  {enabled && (
                    <label className="composer__slider">
                      <span>Weight</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={weight}
                        onChange={(e) =>
                          props.onPresetsChange(upsertPreset(props.presets, entry.id, Number(e.target.value), true))
                        }
                      />
                      <span className="composer__slider-val">{Math.round(weight * 100)}%</span>
                    </label>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {props.mode === 'symptom' && (
        <div className="composer__section" role="group" aria-label="Symptom-first dimensions">
          <div className="composer__title">Experience dimensions</div>
          <p className="composer__hint">
            Dimension descriptions and evidence links are read from `src/conditions/experience-dimensions.json` (read-only).
            Motif-to-node mapping is applied by the Composition Layer (next step).
          </p>
          <div className="composer__list">
            {dims.map((dim) => {
              const enabled = dimIds.has(dim.id)
              const weight = props.dimensions.find((d) => d.dimensionId === dim.id)?.weight ?? 0.5
              return (
                <DimensionRow
                  key={dim.id}
                  dim={dim}
                  selected={enabled}
                  weight={weight}
                  onToggle={(en) => props.onDimensionsChange(upsertDimension(props.dimensions, dim.id, weight, en))}
                  onWeight={(w) => props.onDimensionsChange(upsertDimension(props.dimensions, dim.id, w, true))}
                  onEvidence={props.onOpenEvidence}
                />
              )
            })}
          </div>
          {props.dimensions.length > 0 && (
            <div className="composer__summary" aria-label="Selected dimensions summary">
              <div className="composer__title">Selected</div>
              <ul>
                {props.dimensions.map((d) => (
                  <li key={d.dimensionId}>
                    <strong>{dimById.get(d.dimensionId)?.label ?? d.dimensionId}</strong> — {Math.round(d.weight * 100)}%{' '}
                    <EvidenceButton
                      doc={dimById.get(d.dimensionId)?.rationale_doc ?? `docs/references/dimensions/${d.dimensionId}.md`}
                      onOpen={props.onOpenEvidence}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

