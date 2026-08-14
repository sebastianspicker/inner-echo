import { useMemo } from 'react'
import type { CatalogEntry } from '../conditions/schema'
import {
  getExperienceDimensions,
  type ComposerMode,
  type ExperienceDimensionDef,
  type SelectedDimension,
  type SelectedPreset,
} from '../composer'
import type { EvidenceDocPath } from '../evidence/docs'
import { ConditionComposerInspector } from './ConditionComposerInspector'
import type { PresetLibraryPanelProps } from './PresetLibraryPanel'
import { useConditionStrengths } from './hooks/useConditionStrengths'
import { usePresetLibrary } from './hooks/usePresetLibrary'
import { createPresetPayload, type ApplyPresetPayloadCallbacks } from './presetSnapshot'
import './ConditionComposerPanel.css'

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

export function ConditionComposerPanel(props: ConditionComposerPanelProps) {
  const payloadCallbacks = useMemo<ApplyPresetPayloadCallbacks>(
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
  const dims = useMemo(() => getExperienceDimensions(), [])
  const dimById = useMemo(
    () =>
      new Map<string, ExperienceDimensionDef>(dims.map((dimension) => [dimension.id, dimension])),
    [dims],
  )
  const currentPayload = useMemo(
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
  const conditionStrength = useConditionStrengths(props.catalog, dimById)
  const presetLibrary = usePresetLibrary({ currentPayload, payloadCallbacks })
  const presetLibraryProps: PresetLibraryPanelProps = {
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

  return (
    <section
      className={`composer composer--${props.variant ?? 'setup'}`}
      aria-label="Experience settings"
    >
      <div className="composer__header">
        <div>
          <div className="composer__eyebrow">Setup / Experience</div>
          <h2 className="composer__heading">Shape the metaphor.</h2>
          <p className="composer__hint">
            Choose patterns to combine into one bounded audiovisual profile.
          </p>
        </div>
      </div>

      <div className="composer__workspace">
        <div className="composer__mode">
          {(
            [
              { id: 'symptom', label: 'Experience dimensions' },
              { id: 'preset', label: 'Curated collections' },
              { id: 'multimorbid', label: 'Combine collections' },
            ] as const
          ).map((mode) => (
            <label key={mode.id} className="composer__toggle">
              <input
                type="radio"
                name="composer-mode"
                checked={props.mode === mode.id}
                onChange={() => props.onModeChange(mode.id)}
              />
              <span>{mode.label}</span>
            </label>
          ))}
        </div>

        <ConditionComposerInspector
          catalog={props.catalog}
          dims={dims}
          dimById={dimById}
          conditionStrength={conditionStrength}
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
          presetLibrary={presetLibraryProps}
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
