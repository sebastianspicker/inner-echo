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
import { CuratedProfilePicker } from './CuratedProfilePicker'
import { ProfileBlendList } from './ProfileBlendList'
import { PresetLibraryPanel, type PresetLibraryPanelProps } from '../presets/PresetLibraryPanel'
import { ExperienceDimensionList } from './ExperienceDimensionList'
import { EvidenceButton } from './EvidenceButton'
import { EvidenceGrade } from './EvidenceGrade'
import { filterCatalog, strengthBadge } from './selection'

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

function useFilteredDimensions(dims: ExperienceDimensionDef[], query: string) {
  return useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return dims
    return dims.filter((entry) => {
      const haystack = `${entry.label} ${entry.description ?? ''} ${entry.id}`.toLowerCase()
      return haystack.includes(normalized)
    })
  }, [dims, query])
}

interface FilterControlProps {
  value: string
  placeholder: string
  label: string
  resultCount: number
  onChange: (value: string) => void
}

function FilterControl(props: FilterControlProps) {
  return (
    <label className="composer__filter">
      <span className="sr-only">Filter</span>
      <input
        type="text"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
        aria-label={props.label}
      />
      <span className="composer__filterCount">{props.resultCount} listed</span>
    </label>
  )
}

interface InspectorSelectionProps extends ExperienceComposerInspectorProps {
  filteredCatalog: CatalogEntry[]
  filteredDims: ExperienceDimensionDef[]
  presetIds: Set<string>
  dimIds: Set<string>
}

function CuratedSelection(props: InspectorSelectionProps) {
  const currentConditionBadge = strengthBadge(props.conditionStrength[props.selection.conditionId])
  if (props.selection.mode !== 'preset') return null
  return (
    <div className="composer__section">
      <CuratedProfilePicker
        catalog={props.filteredCatalog}
        value={props.selection.conditionId}
        onChange={props.selection.onConditionIdChange}
        aria-label="Curated collection"
      />
      <div className="composer__row-meta">
        <EvidenceGrade badge={currentConditionBadge} />
        <EvidenceButton
          doc={`docs/references/conditions/${props.selection.conditionId}.md`}
          onOpen={props.onOpenEvidence}
        />
      </div>
    </div>
  )
}

function DimensionSelection(props: InspectorSelectionProps) {
  if (props.selection.mode !== 'symptom') return null
  return (
    <>
      <ExperienceDimensionList
        dims={props.filteredDims}
        dimById={props.dimById}
        dimIds={props.dimIds}
        dimensions={props.selection.dimensions}
        onDimensionsChange={props.selection.onDimensionsChange}
        onOpenEvidence={props.onOpenEvidence}
      />
      {props.selection.dimensions.length === 0 && (
        <p className="composer__empty ie-gloss" role="status">
          No dimensions selected. Choose one or more to prepare an audiovisual profile.
        </p>
      )}
    </>
  )
}

function InspectorSelection(props: InspectorSelectionProps) {
  return (
    <>
      <CuratedSelection {...props} />
      {props.selection.mode === 'multimorbid' && (
        <ProfileBlendList
          catalog={props.filteredCatalog}
          presetIds={props.presetIds}
          presets={props.selection.presets}
          conditionStrength={props.conditionStrength}
          onPresetsChange={props.selection.onPresetsChange}
          onOpenEvidence={props.onOpenEvidence}
        />
      )}
      <DimensionSelection {...props} />
    </>
  )
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
  const filteredDims = useFilteredDimensions(dims, dimensionQuery)
  const presetIds = new Set(selection.presets.map((preset) => preset.profileId))
  const dimIds = new Set(selection.dimensions.map((dimension) => dimension.dimensionId))
  const selectionProps = {
    catalog,
    dims,
    dimById,
    conditionStrength,
    selection,
    controls,
    presetLibrary,
    readiness,
    onOpenEvidence,
    filteredCatalog,
    filteredDims,
    presetIds,
    dimIds,
  }

  return (
    <div className="composer__inspector">
      {(selection.mode === 'preset' || selection.mode === 'multimorbid') && (
        <FilterControl
          value={conditionQuery}
          placeholder="Search experiences"
          label="Experience search"
          resultCount={filteredCatalog.length}
          onChange={setConditionQuery}
        />
      )}

      {selection.mode === 'symptom' && (
        <FilterControl
          value={dimensionQuery}
          placeholder="Find a dimension"
          label="Dimension search"
          resultCount={filteredDims.length}
          onChange={setDimensionQuery}
        />
      )}

      {selection.mode === 'symptom' && filteredDims.length === 0 ? (
        <p className="composer__empty ie-gloss" role="status">
          No dimensions match your search. Try a different word.
        </p>
      ) : (
        <InspectorSelection {...selectionProps} />
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
  )
}
