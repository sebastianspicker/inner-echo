import { LabeledSlider } from './controls/LabeledSlider'

export interface AdvancedComposerPanelProps {
  couplingStrength: number
  maxFeedback: number
  interactionAmount: number
  onCouplingStrengthChange: (value: number) => void
  onMaxFeedbackChange: (value: number) => void
  onInteractionAmountChange: (value: number) => void
}

export function AdvancedComposerPanel(props: AdvancedComposerPanelProps) {
  return (
    <details className="composer__advanced">
      <summary>Advanced composition</summary>
      <div className="composer__advanced-body">
        <LabeledSlider
          label="Coupling strength"
          min={0}
          max={1}
          value={props.couplingStrength}
          onChange={props.onCouplingStrengthChange}
        />
        <LabeledSlider
          label="Reactive response limit"
          min={0}
          max={1}
          value={props.maxFeedback}
          onChange={props.onMaxFeedbackChange}
        />
        <LabeledSlider
          label="Interaction amount"
          min={0}
          max={1}
          value={props.interactionAmount}
          onChange={props.onInteractionAmountChange}
        />
        <p className="composer__hint">
          Links changes in picture and sound; microphone input contributes only when enabled. These
          are artistic responses, not measurements of mental state. Existing comfort limits still
          apply.
        </p>
      </div>
    </details>
  )
}
