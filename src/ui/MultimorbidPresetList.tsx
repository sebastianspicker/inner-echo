import type { CatalogEntry } from '../conditions/schema'
import type { SelectedPreset } from '../composer'
import type { EvidenceDocPath } from '../evidence/docs'
import { strengthBadge, EvidenceButton, upsertPreset } from './composerUtils'

export interface MultimorbidPresetListProps {
  catalog: CatalogEntry[]
  presetIds: Set<string>
  presets: SelectedPreset[]
  conditionStrength: Record<string, string>
  onPresetsChange: (presets: SelectedPreset[]) => void
  onOpenEvidence: (docPath: EvidenceDocPath) => void
}

type PresetRowProps = Omit<MultimorbidPresetListProps, 'catalog' | 'presetIds'> & {
  entry: CatalogEntry
  enabled: boolean
  weight: number
}

function PresetRow({
  entry,
  enabled,
  weight,
  presets,
  conditionStrength,
  onPresetsChange,
  onOpenEvidence,
}: PresetRowProps) {
  const badge = strengthBadge(conditionStrength[entry.id])
  const setEnabled = (next: boolean) =>
    onPresetsChange(upsertPreset(presets, entry.id, weight, next))
  const setWeight = (raw: string) => {
    const value = Number(raw)
    if (Number.isFinite(value)) onPresetsChange(upsertPreset(presets, entry.id, value, true))
  }
  return (
    <div className="composer__row">
      <label className="composer__row-main">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span className="composer__row-title">{entry.label}</span>
        <span className="composer__row-sub">{entry.description ?? ''}</span>
      </label>
      <div className="composer__row-meta">
        {badge && <span className={badge.className}>{badge.label}</span>}
        <EvidenceButton doc={`docs/references/conditions/${entry.id}.md`} onOpen={onOpenEvidence} />
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
            aria-label={`Weight for ${entry.label}`}
            onChange={(e) => setWeight(e.target.value)}
          />
          <span className="composer__slider-val">{Math.round(weight * 100)}%</span>
        </label>
      )}
    </div>
  )
}

export function MultimorbidPresetList({
  catalog,
  presetIds,
  presets,
  conditionStrength,
  onPresetsChange,
  onOpenEvidence,
}: MultimorbidPresetListProps) {
  return (
    <div className="composer__section" role="group" aria-label="Multimorbid preset stack">
      <div className="composer__title">Preset stack</div>
      <p className="composer__hint">
        Combine multiple presets with per-preset weights (metaphor-first, safety-clamped).
      </p>
      {/* Note: if the catalog grows significantly, consider virtualizing this list (e.g. react-window). */}
      <div className="composer__list">
        {catalog.map((entry: CatalogEntry) => {
          const enabled = presetIds.has(entry.id)
          const weight = presets.find((p) => p.profileId === entry.id)?.weight ?? 0.5
          return (
            <PresetRow
              key={entry.id}
              entry={entry}
              enabled={enabled}
              weight={weight}
              presets={presets}
              conditionStrength={conditionStrength}
              onPresetsChange={onPresetsChange}
              onOpenEvidence={onOpenEvidence}
            />
          )
        })}
      </div>
    </div>
  )
}
