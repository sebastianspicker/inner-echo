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

export function MultimorbidPresetList({
  catalog,
  presetIds,
  presets,
  conditionStrength,
  onPresetsChange,
  onOpenEvidence,
}: MultimorbidPresetListProps) {
  return (
    <div className="composer__section" role="group" aria-label="Combined curated collections">
      <div className="composer__title">Selected collections</div>
      <p className="composer__hint">
        Combine curated collections and adjust their relative contribution. Safe Mode limits the
        resulting profile.
      </p>
      <div className="composer__list">
        {catalog.map((entry: CatalogEntry) => {
          const enabled = presetIds.has(entry.id)
          const weight = presets.find((p) => p.profileId === entry.id)?.weight ?? 0.5
          const badge = strengthBadge(conditionStrength[entry.id])
          return (
            <div key={entry.id} className="composer__row">
              <label className="composer__row-main">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) =>
                    onPresetsChange(upsertPreset(presets, entry.id, weight, e.target.checked))
                  }
                />
                <span className="composer__row-title">{entry.label}</span>
                <span className="composer__row-sub">{entry.description ?? ''}</span>
              </label>
              <div className="composer__row-meta">
                {badge && <span className={badge.className}>{badge.label}</span>}
                <EvidenceButton
                  doc={`docs/references/conditions/${entry.id}.md`}
                  onOpen={onOpenEvidence}
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
                    aria-label={`Weight for ${entry.label}`}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      if (!Number.isFinite(n)) return
                      onPresetsChange(upsertPreset(presets, entry.id, n, true))
                    }}
                  />
                  <span className="composer__slider-val">{Math.round(weight * 100)}%</span>
                </label>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
