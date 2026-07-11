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
          label="Maximum feedback"
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
          These settings shape how selected elements respond to one another. Safe Mode limits remain
          active.
        </p>
      </div>
    </details>
  )
}
