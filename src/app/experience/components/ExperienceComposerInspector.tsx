import { useMemo, useState } from 'react'
import type { CatalogEntry } from '../../../domain/experience/schema'
import type {
  ComposerMode,
  ExperienceDimensionDef,
  SelectedDimension,
  SelectedPreset,
} from '../../../domain/experience/composition/types'
import type { EvidenceDocPath } from '../../../content/evidence'
import { AdvancedComposerPanel } from './AdvancedComposerPanel'
import { CompositionMap } from './CompositionMap'
import { CuratedProfilePicker } from './CuratedProfilePicker'
import { ProfileBlendList } from './ProfileBlendList'
import { PresetLibraryPanel, type PresetLibraryPanelProps } from './PresetLibraryPanel'
import { ExperienceDimensionList } from './ExperienceDimensionList'
import { filterCatalog } from '../session/composerCatalog'
import { EvidenceButton, strengthBadge } from '../session/composerUtils'

export interface ExperienceComposerInspectorSelection {
  mode: ComposerMode
  conditionId: string
  presets: SelectedPreset[]
  dimensions: SelectedDimension[]
  onConditionIdChange: (id: string) => void
  onPresetsChange: (next: SelectedPreset[]) => void
  onDimensionsChange: (next: SelectedDimension[]) => void
}

export interface ExperienceComposerInspectorControls {
  couplingStrength: number
  maxFeedback: number
  interactionAmount: number
  onCouplingStrengthChange: (value: number) => void
  onMaxFeedbackChange: (value: number) => void
  onInteractionAmountChange: (value: number) => void
}

export interface ExperienceComposerInspectorReadiness {
  cameraRequesting?: boolean
  onStartCamera?: () => void
}

export interface ExperienceComposerInspectorProps {
  catalog: CatalogEntry[] | null
  dims: ExperienceDimensionDef[]
  dimById: Map<string, ExperienceDimensionDef>
  conditionStrength: Record<string, string>
  selection: ExperienceComposerInspectorSelection
  controls: ExperienceComposerInspectorControls
  presetLibrary: PresetLibraryPanelProps
  readiness: ExperienceComposerInspectorReadiness
  onOpenEvidence: (docPath: EvidenceDocPath) => void
}

export function ExperienceComposerInspector({
  catalog,
  dims,
  dimById,
  conditionStrength,
  selection,
  controls,
  presetLibrary,
  readiness,
  onOpenEvidence,
}: ExperienceComposerInspectorProps) {
  const [conditionQuery, setConditionQuery] = useState('')
  const [dimensionQuery, setDimensionQuery] = useState('')
  const filteredCatalog = useMemo(
    () => filterCatalog(catalog, selection.conditionId, conditionQuery),
    [catalog, conditionQuery, selection.conditionId],
  )
  const filteredDims = useMemo(() => {
    const query = dimensionQuery.trim().toLowerCase()
    if (!query) return dims
    return dims.filter((entry) => {
      const haystack = `${entry.label} ${entry.description ?? ''} ${entry.id}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [dims, dimensionQuery])
  const presetIds = useMemo(
    () => new Set(selection.presets.map((preset) => preset.profileId)),
    [selection.presets],
  )
  const dimIds = useMemo(
    () => new Set(selection.dimensions.map((dimension) => dimension.dimensionId)),
    [selection.dimensions],
  )
  const currentConditionBadge = strengthBadge(conditionStrength[selection.conditionId])

  return (
    <>
      <CompositionMap
        mode={selection.mode}
        conditionId={selection.conditionId}
        dimensions={selection.dimensions}
        presets={selection.presets}
      />

      <div className="composer__inspector">
        <div className="composer__inspectorHeader">
          <div className="composer__title">
            {selection.mode === 'symptom'
              ? 'Experience dimensions'
              : selection.mode === 'preset'
                ? 'Curated collection'
                : 'Combined collections'}
          </div>
          <p className="composer__hint">Media remains off while you configure this view.</p>
        </div>

        {(selection.mode === 'preset' || selection.mode === 'multimorbid') && (
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

        {selection.mode === 'preset' && (
          <div className="composer__section">
            <CuratedProfilePicker
              catalog={filteredCatalog}
              value={selection.conditionId}
              onChange={selection.onConditionIdChange}
              aria-label="Curated collection"
            />
            <div className="composer__row-meta">
              {currentConditionBadge && (
                <span className={currentConditionBadge.className}>
                  {currentConditionBadge.label}
                </span>
              )}
              <EvidenceButton
                doc={`docs/references/conditions/${selection.conditionId}.md`}
                onOpen={onOpenEvidence}
              />
            </div>
          </div>
        )}

        {selection.mode === 'multimorbid' && (
          <ProfileBlendList
            catalog={filteredCatalog}
            presetIds={presetIds}
            presets={selection.presets}
            conditionStrength={conditionStrength}
            onPresetsChange={selection.onPresetsChange}
            onOpenEvidence={onOpenEvidence}
          />
        )}

        {selection.mode === 'symptom' && (
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
            <ExperienceDimensionList
              dims={filteredDims}
              dimById={dimById}
              dimIds={dimIds}
              dimensions={selection.dimensions}
              onDimensionsChange={selection.onDimensionsChange}
              onOpenEvidence={onOpenEvidence}
            />
            {selection.dimensions.length === 0 && (
              <p className="composer__empty" role="status">
                No dimensions selected. Choose one or more to prepare an audiovisual profile.
              </p>
            )}
          </>
        )}

        <AdvancedComposerPanel {...controls} />
        <PresetLibraryPanel {...presetLibrary} />

        {readiness.onStartCamera && (
          <div className="composer__readiness">
            <div>
              <strong>Ready to preview</strong>
              <span>Camera, sound, and microphone remain off.</span>
            </div>
            <button
              type="button"
              className="ie-btn ie-btn--accent"
              onClick={readiness.onStartCamera}
              disabled={readiness.cameraRequesting}
              aria-busy={readiness.cameraRequesting}
            >
              {readiness.cameraRequesting ? 'Requesting camera…' : 'Start camera'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
