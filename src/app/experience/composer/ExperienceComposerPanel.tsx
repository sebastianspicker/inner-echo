import { useMemo } from 'react'
import type { CatalogEntry } from '../../../domain/experience/schema'
import type {
  ComposerMode,
  ExperienceDimensionDef,
  SelectedDimension,
  SelectedPreset,
} from '../../../domain/experience/composition/types'
import { getExperienceDimensions } from '../../../content/experience/experienceDimensions'
import type { EvidenceDocPath } from '../../../content/evidence'
import { ExperienceComposerInspector } from './ExperienceComposerInspector'
import type { PresetLibraryPanelProps } from '../presets/PresetLibraryPanel'
import { useProfileBadgeStrengths } from '../profile/useProfileBadgeStrengths'
import { usePresetLibrary } from '../presets/usePresetLibrary'
import type { PresetPayload } from '../presets/format'
import { settingsToPayload, type ExperienceSettings } from '../workspace/settings'
import './ExperienceComposerPanel.css'

export interface ExperienceComposerPanelProps {
  catalog: CatalogEntry[] | null
  settings: ExperienceSettings
  setComposerMode: (mode: ComposerMode) => void
  setConditionId: (id: string) => void
  setPresets: (presets: SelectedPreset[]) => void
  setDimensions: (dimensions: SelectedDimension[]) => void
  setCouplingStrength: (value: number) => void
  setMaxFeedback: (value: number) => void
  setInteractionAmount: (value: number) => void

  /** Read for the saved/shared configuration payload; the session is its sole owner. */
  audioEnabled: boolean
  /** Applies a loaded/shared payload in one call: settings.apply(...) + forcing sound off. */
  onApplyPreset: (payload: PresetPayload) => void

  onOpenEvidence: (docPath: EvidenceDocPath) => void
  variant?: 'setup' | 'compact'
  cameraRequesting?: boolean
  onStartCamera?: () => void
}

function toPresetLibraryPanelProps(
  presetLibrary: ReturnType<typeof usePresetLibrary>,
): PresetLibraryPanelProps {
  return {
    library: presetLibrary.library,
    selectedId: presetLibrary.selectedLibraryId,
    name: presetLibrary.presetName,
    warning: presetLibrary.libraryWarning,
    hasSelection: presetLibrary.selectedSnapshot != null,
    canUndoDelete: presetLibrary.canUndoDelete,
    copyStatus: presetLibrary.copyStatus,
    copyAction: presetLibrary.copyAction,
    saveStatus: presetLibrary.saveStatus,
    onNameChange: presetLibrary.onNameChange,
    onSelectionChange: presetLibrary.onSelectionChange,
    onSave: presetLibrary.onSave,
    onUpdate: presetLibrary.onUpdate,
    onLoad: presetLibrary.onLoad,
    onDelete: presetLibrary.onDelete,
    onCopyConfiguration: () => void presetLibrary.onCopyConfiguration(),
    onCopyShareLink: () => void presetLibrary.onCopyShareLink(),
    onUndoDelete: presetLibrary.onUndoDelete,
  }
}

export function ExperienceComposerPanel(props: ExperienceComposerPanelProps) {
  const dims = useMemo(() => getExperienceDimensions(), [])
  const dimById = useMemo(
    () =>
      new Map<string, ExperienceDimensionDef>(dims.map((dimension) => [dimension.id, dimension])),
    [dims],
  )
  const currentPayload = useMemo(
    () => settingsToPayload(props.settings, props.audioEnabled),
    [props.settings, props.audioEnabled],
  )
  const conditionStrength = useProfileBadgeStrengths(
    props.settings.composerMode,
    props.settings.conditionId,
    props.catalog,
    dimById,
  )
  const presetLibrary = usePresetLibrary({ currentPayload, onApply: props.onApplyPreset })
  const presetLibraryProps = toPresetLibraryPanelProps(presetLibrary)

  return (
    <ComposerWorkspace
      {...props}
      dims={dims}
      dimById={dimById}
      conditionStrength={conditionStrength}
      presetLibrary={presetLibraryProps}
    />
  )
}

interface ComposerWorkspaceProps extends ExperienceComposerPanelProps {
  dims: ExperienceDimensionDef[]
  dimById: Map<string, ExperienceDimensionDef>
  conditionStrength: Record<string, string>
  presetLibrary: PresetLibraryPanelProps
}

function ComposerModeChooser({
  mode,
  onModeChange,
}: {
  mode: ComposerMode
  onModeChange: (mode: ComposerMode) => void
}) {
  const modes = [
    { id: 'symptom', label: 'Experience dimensions' },
    { id: 'preset', label: 'Curated collections' },
    { id: 'multimorbid', label: 'Combine collections' },
  ] as const
  return (
    <fieldset className="composer__mode">
      <legend className="sr-only">Choose how to compose</legend>
      {modes.map((item) => (
        <label key={item.id} className="composer__toggle">
          <input
            className="composer__modeInput"
            type="radio"
            name="composer-mode"
            checked={mode === item.id}
            onChange={() => onModeChange(item.id)}
          />
          <span>{item.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

function ComposerWorkspace(props: ComposerWorkspaceProps) {
  const { settings } = props
  return (
    <section
      className={`composer composer--${props.variant ?? 'setup'}`}
      aria-label="Experience settings"
    >
      <div className="composer__workspace">
        <ComposerModeChooser mode={settings.composerMode} onModeChange={props.setComposerMode} />

        <ExperienceComposerInspector
          catalog={props.catalog}
          dims={props.dims}
          dimById={props.dimById}
          conditionStrength={props.conditionStrength}
          selection={{
            mode: settings.composerMode,
            conditionId: settings.conditionId,
            presets: settings.presets,
            dimensions: settings.dimensions,
            onConditionIdChange: props.setConditionId,
            onPresetsChange: props.setPresets,
            onDimensionsChange: props.setDimensions,
          }}
          controls={{
            couplingStrength: settings.couplingStrength,
            maxFeedback: settings.maxFeedback,
            interactionAmount: settings.interactionAmount,
            onCouplingStrengthChange: props.setCouplingStrength,
            onMaxFeedbackChange: props.setMaxFeedback,
            onInteractionAmountChange: props.setInteractionAmount,
          }}
          presetLibrary={props.presetLibrary}
          readiness={{
            cameraRequesting: props.cameraRequesting,
            onStartCamera: props.onStartCamera,
          }}
          onOpenEvidence={props.onOpenEvidence}
        />
      </div>
    </section>
  )
}
