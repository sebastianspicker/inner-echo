import type { SelectedDimension, ExperienceDimensionDef } from '../composer'
import type { EvidenceDocPath } from '../evidence/docs'
import type { ChangeEvent } from 'react'
import { strengthBadge, EvidenceButton, upsertDimension } from './composerUtils'

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
  const handleToggle = (event: ChangeEvent<HTMLInputElement>): void => {
    onToggle(event.target.checked)
  }
  return (
    <div className="composer__row">
      <label className="composer__row-main">
        <input type="checkbox" checked={selected} onChange={handleToggle} />
        <span className="composer__row-title">{dim.label ?? dim.id}</span>
        <span className="composer__row-sub">{dim.description}</span>
      </label>
      <div className="composer__row-meta">
        {badge && <span className={badge.className}>{badge.label}</span>}
        <EvidenceButton doc={dim.rationale_doc} onOpen={onEvidence} />
      </div>
      {selected && <DimensionWeightSlider dimension={dim} weight={weight} onWeight={onWeight} />}
    </div>
  )
}

function DimensionWeightSlider({
  dimension,
  weight,
  onWeight,
}: {
  dimension: ExperienceDimensionDef
  weight: number
  onWeight: (weight: number) => void
}) {
  const handleWeightChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const nextWeight = Number(event.target.value)
    if (Number.isFinite(nextWeight)) onWeight(nextWeight)
  }
  return (
    <label className="composer__slider">
      <span>Weight</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={weight}
        aria-label={`Weight for ${dimension.label ?? dimension.id}`}
        onChange={handleWeightChange}
      />
      <span className="composer__slider-val">{Math.round(weight * 100)}%</span>
    </label>
  )
}

function getDimensionWeight(dimensions: SelectedDimension[], dimensionId: string): number {
  return dimensions.find((dimension) => dimension.dimensionId === dimensionId)?.weight ?? 0.5
}

interface SymptomDimensionRowsProps {
  dims: ExperienceDimensionDef[]
  dimIds: Set<string>
  dimensions: SelectedDimension[]
  onDimensionsChange: (dims: SelectedDimension[]) => void
  onOpenEvidence: (docPath: EvidenceDocPath) => void
}

function SymptomDimensionRows({
  dims,
  dimIds,
  dimensions,
  onDimensionsChange,
  onOpenEvidence,
}: SymptomDimensionRowsProps) {
  return dims.map((dim) => {
    const selected = dimIds.has(dim.id)
    const weight = getDimensionWeight(dimensions, dim.id)
    return (
      <DimensionRow
        key={dim.id}
        dim={dim}
        selected={selected}
        weight={weight}
        onToggle={(enabled) =>
          onDimensionsChange(upsertDimension(dimensions, dim.id, weight, enabled))
        }
        onWeight={(nextWeight) =>
          onDimensionsChange(upsertDimension(dimensions, dim.id, nextWeight, true))
        }
        onEvidence={onOpenEvidence}
      />
    )
  })
}

export interface SymptomDimensionListProps {
  dims: ExperienceDimensionDef[]
  dimById: Map<string, ExperienceDimensionDef>
  dimIds: Set<string>
  dimensions: SelectedDimension[]
  onDimensionsChange: (dims: SelectedDimension[]) => void
  onOpenEvidence: (docPath: EvidenceDocPath) => void
}

export function SymptomDimensionList({
  dims,
  dimById,
  dimIds,
  dimensions,
  onDimensionsChange,
  onOpenEvidence,
}: SymptomDimensionListProps) {
  return (
    <div className="composer__section" role="group" aria-label="Experience dimensions">
      <div className="composer__title">Experience dimensions</div>
      <p className="composer__hint">
        Select patterns to combine into one bounded audiovisual profile. Each evidence link explains
        the metaphor, its source basis, and its limits.
      </p>
      <div className="composer__list">
        <SymptomDimensionRows
          dims={dims}
          dimIds={dimIds}
          dimensions={dimensions}
          onDimensionsChange={onDimensionsChange}
          onOpenEvidence={onOpenEvidence}
        />
      </div>
      {dimensions.length > 0 && (
        <div className="composer__summary" aria-label="Selected dimensions summary">
          <div className="composer__title">Selected</div>
          <ul>
            {dimensions.map((d) => (
              <li key={d.dimensionId}>
                <strong>{dimById.get(d.dimensionId)?.label ?? d.dimensionId}</strong> -{' '}
                {Math.round(d.weight * 100)}%{' '}
                <EvidenceButton
                  doc={
                    dimById.get(d.dimensionId)?.rationale_doc ??
                    `docs/references/dimensions/${d.dimensionId}.md`
                  }
                  onOpen={onOpenEvidence}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
