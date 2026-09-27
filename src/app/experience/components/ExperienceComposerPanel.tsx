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
import type { PresetLibraryPanelProps } from './PresetLibraryPanel'
import { useProfileBadgeStrengths } from '../hooks/useProfileBadgeStrengths'
import { usePresetLibrary } from '../presets/usePresetLibrary'
import { createPresetPayload, type ApplyPresetPayloadCallbacks } from '../presets/payloadCodec'
import './ExperienceComposerPanel.css'

export interface ExperienceComposerPanelProps {
  catalog: CatalogEntry[] | null

  mode: ComposerMode
  onModeChange: (mode: ComposerMode) => void

  // Curated mode (single profile). The persisted field name is a compatibility contract.
  conditionId: string
  onConditionIdChange: (id: string) => void

  // Blend mode (multiple curated profiles).
  presets: SelectedPreset[]
  onPresetsChange: (next: SelectedPreset[]) => void

  // Dimension mode (direct experience-dimension composition).
  dimensions: SelectedDimension[]
  onDimensionsChange: (next: SelectedDimension[]) => void

  // Global settings
  intensity: number
  onIntensityChange: (value: number) => void
  safeMode: boolean
  onSafeModeChange: (value: boolean) => void
  reducedMotion: boolean
  onReducedMotionChange: (value: boolean) => void

  audioEnabled: boolean
  onAudioEnabledChange: (value: boolean) => void
  couplingStrength: number
  onCouplingStrengthChange: (value: number) => void
  maxFeedback: number
  onMaxFeedbackChange: (value: number) => void
  interactionAmount: number
  onInteractionAmountChange: (value: number) => void

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

function usePresetPayloadCallbacks(
  props: ExperienceComposerPanelProps,
): ApplyPresetPayloadCallbacks {
  return useMemo<ApplyPresetPayloadCallbacks>(
    () => ({
      onModeChange: props.onModeChange,
      onConditionIdChange: props.onConditionIdChange,
      onPresetsChange: props.onPresetsChange,
      onDimensionsChange: props.onDimensionsChange,
      onIntensityChange: props.onIntensityChange,
      onSafeModeChange: props.onSafeModeChange,
      onReducedMotionChange: props.onReducedMotionChange,
      onAudioEnabledChange: props.onAudioEnabledChange,
      onCouplingStrengthChange: props.onCouplingStrengthChange,
      onMaxFeedbackChange: props.onMaxFeedbackChange,
      onInteractionAmountChange: props.onInteractionAmountChange,
    }),
    [
      props.onModeChange,
      props.onConditionIdChange,
      props.onPresetsChange,
      props.onDimensionsChange,
      props.onIntensityChange,
      props.onSafeModeChange,
      props.onReducedMotionChange,
      props.onAudioEnabledChange,
      props.onCouplingStrengthChange,
      props.onMaxFeedbackChange,
      props.onInteractionAmountChange,
    ],
  )
}

function useCurrentPresetPayload(props: ExperienceComposerPanelProps) {
  return useMemo(
    () =>
      createPresetPayload({
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
        interactionAmount: props.interactionAmount,
      }),
    [
      props.mode,
      props.conditionId,
      props.presets,
      props.dimensions,
      props.intensity,
      props.safeMode,
      props.reducedMotion,
      props.audioEnabled,
      props.couplingStrength,
      props.maxFeedback,
      props.interactionAmount,
    ],
  )
}

export function ExperienceComposerPanel(props: ExperienceComposerPanelProps) {
  const payloadCallbacks = usePresetPayloadCallbacks(props)
  const dims = useMemo(() => getExperienceDimensions(), [])
  const dimById = useMemo(
    () =>
      new Map<string, ExperienceDimensionDef>(dims.map((dimension) => [dimension.id, dimension])),
    [dims],
  )
  const currentPayload = useCurrentPresetPayload(props)
  const conditionStrength = useProfileBadgeStrengths(
    props.mode,
    props.conditionId,
    props.catalog,
    dimById,
  )
  const presetLibrary = usePresetLibrary({ currentPayload, payloadCallbacks })
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
}: Pick<ExperienceComposerPanelProps, 'mode' | 'onModeChange'>) {
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
  return (
    <section
      className={`composer composer--${props.variant ?? 'setup'}`}
      aria-label="Experience settings"
    >
      <div className="composer__workspace">
        <ComposerModeChooser mode={props.mode} onModeChange={props.onModeChange} />

        <ExperienceComposerInspector
          catalog={props.catalog}
          dims={props.dims}
          dimById={props.dimById}
          conditionStrength={props.conditionStrength}
          selection={{
            mode: props.mode,
            conditionId: props.conditionId,
            presets: props.presets,
            dimensions: props.dimensions,
            onConditionIdChange: props.onConditionIdChange,
            onPresetsChange: props.onPresetsChange,
            onDimensionsChange: props.onDimensionsChange,
          }}
          controls={{
            couplingStrength: props.couplingStrength,
            maxFeedback: props.maxFeedback,
            interactionAmount: props.interactionAmount,
            onCouplingStrengthChange: props.onCouplingStrengthChange,
            onMaxFeedbackChange: props.onMaxFeedbackChange,
            onInteractionAmountChange: props.onInteractionAmountChange,
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
