import type { SelectedDimension } from '../composer'
import type { ExperienceDimensionDef } from '../composer'
import type { EvidenceDocPath } from '../evidence/docs'
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
                        onChange={(e) => {
                            const n = Number(e.target.value)
                            if (!Number.isFinite(n)) return
                            onWeight(n)
                        }}
                    />
                    <span className="composer__slider-val">{Math.round(weight * 100)}%</span>
                </label>
            )}
        </div>
    )
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
        <div className="composer__section" role="group" aria-label="Symptom-first dimensions">
            <div className="composer__title">Experience dimensions</div>
            <p className="composer__hint">
                Dimension descriptions and evidence links are read from `src/conditions/experience-dimensions.json` (read-only).
                Motif-to-node mapping is applied by the Composition Layer (next step).
            </p>
            <div className="composer__list">
                {dims.map((dim) => {
                    const enabled = dimIds.has(dim.id)
                    const weight = dimensions.find((d) => d.dimensionId === dim.id)?.weight ?? 0.5
                    return (
                        <DimensionRow
                            key={dim.id}
                            dim={dim}
                            selected={enabled}
                            weight={weight}
                            onToggle={(en) => onDimensionsChange(upsertDimension(dimensions, dim.id, weight, en))}
                            onWeight={(w) => onDimensionsChange(upsertDimension(dimensions, dim.id, w, true))}
                            onEvidence={onOpenEvidence}
                        />
                    )
                })}
            </div>
            {dimensions.length > 0 && (
                <div className="composer__summary" aria-label="Selected dimensions summary">
                    <div className="composer__title">Selected</div>
                    <ul>
                        {dimensions.map((d) => (
                            <li key={d.dimensionId}>
                                <strong>{dimById.get(d.dimensionId)?.label ?? d.dimensionId}</strong> — {Math.round(d.weight * 100)}%{' '}
                                <EvidenceButton
                                    doc={dimById.get(d.dimensionId)?.rationale_doc ?? `docs/references/dimensions/${d.dimensionId}.md`}
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
