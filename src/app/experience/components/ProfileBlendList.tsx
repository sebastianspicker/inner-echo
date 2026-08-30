import type { CatalogEntry } from '../../../domain/experience/schema'
import type { SelectedPreset } from '../../../domain/experience/composition/types'
import type { EvidenceDocPath } from '../../../content/evidence'
import { strengthBadge, EvidenceButton, upsertPreset } from '../session/composerUtils'

export interface ProfileBlendListProps {
  catalog: CatalogEntry[]
  presetIds: Set<string>
  presets: SelectedPreset[]
  conditionStrength: Record<string, string>
  onPresetsChange: (presets: SelectedPreset[]) => void
  onOpenEvidence: (docPath: EvidenceDocPath) => void
}

export function ProfileBlendList({
  catalog,
  presetIds,
  presets,
  conditionStrength,
  onPresetsChange,
  onOpenEvidence,
}: ProfileBlendListProps) {
  return (
    <div className="composer__section" role="group" aria-label="Combined curated collections">
      <div className="composer__title">Selected collections</div>
      <p className="composer__hint">
        Combine curated collections and adjust their relative contribution. Safe Mode limits the
        resulting profile.
      </p>
      <div className="composer__list">
        {catalog.map((entry: CatalogEntry) => (
          <ProfileBlendRow
            key={entry.id}
            entry={entry}
            enabled={presetIds.has(entry.id)}
            presets={presets}
            strength={conditionStrength[entry.id]}
            onPresetsChange={onPresetsChange}
            onOpenEvidence={onOpenEvidence}
          />
        ))}
      </div>
    </div>
  )
}

interface ProfileBlendRowProps {
  entry: CatalogEntry
  enabled: boolean
  presets: SelectedPreset[]
  strength: string
  onPresetsChange: (next: SelectedPreset[]) => void
  onOpenEvidence: (docPath: EvidenceDocPath) => void
}

function ProfileBlendRow(props: ProfileBlendRowProps) {
  const { entry, enabled, presets, onPresetsChange, onOpenEvidence } = props
  const weight = presets.find((preset) => preset.profileId === entry.id)?.weight ?? 0.5
  const badge = strengthBadge(props.strength)
  const updateWeight = (raw: string): void => {
    const nextWeight = Number(raw)
    if (!Number.isFinite(nextWeight)) return
    onPresetsChange(upsertPreset(presets, entry.id, nextWeight, true))
  }

  return (
    <div className="composer__row">
      <label className="composer__row-main">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) =>
            onPresetsChange(upsertPreset(presets, entry.id, weight, event.target.checked))
          }
        />
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
            onChange={(event) => updateWeight(event.target.value)}
          />
          <span className="composer__slider-val">{Math.round(weight * 100)}%</span>
        </label>
      )}
    </div>
  )
}
