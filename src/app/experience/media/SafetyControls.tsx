import { LabeledSlider } from '../ui/LabeledSlider'
import { ToggleField } from '../ui/ToggleField'

export interface SafetyControlsProps {
  intensity: number
  safeMode: boolean
  reducedMotion: boolean
  onIntensityChange: (value: number) => void
  onSafeModeChange: (value: boolean) => void
  onReducedMotionChange: (value: boolean) => void
}

export function SafetyControls(props: SafetyControlsProps) {
  return (
    <section className="ie-safety" aria-labelledby="safety-controls-title">
      <div className="ie-safety__heading">
        <h2 id="safety-controls-title" className="ie-sectionHead">
          Comfort
        </h2>
        <p>Applies to everything you see and hear. Change it at any time.</p>
      </div>
      <div className="ie-safety__controls">
        <LabeledSlider
          id="core-intensity"
          label="Intensity"
          description="Overall strength of the active visual profile."
          value={props.intensity}
          min={0}
          max={1}
          onChange={props.onIntensityChange}
        />
        <ToggleField
          id="core-safe-mode"
          className="ie-control ie-control--toggle"
          label="Safe Mode"
          description="Damps intensity and limits stronger feedback and effect parameters."
          checked={props.safeMode}
          onChange={props.onSafeModeChange}
        />
        <ToggleField
          id="core-reduced-motion"
          className="ie-control ie-control--toggle"
          label="Reduced Motion"
          description="Suppresses motion-heavy and temporal effects."
          checked={props.reducedMotion}
          onChange={props.onReducedMotionChange}
        />
      </div>
    </section>
  )
}
