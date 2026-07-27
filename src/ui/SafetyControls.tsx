import { LabeledSlider } from './controls/LabeledSlider'
import { ToggleField } from './controls/ToggleField'

export interface SafetyControlsProps {
  intensity: number
  safeMode: boolean
  reducedMotion: boolean
  isRequesting: boolean
  isActive: boolean
  canStart: boolean
  canStop: boolean
  onIntensityChange: (value: number) => void
  onSafeModeChange: (value: boolean) => void
  onReducedMotionChange: (value: boolean) => void
  onStart: () => void
  onStop: () => void
  variant?: 'setup' | 'live'
  showCameraActions?: boolean
}

export function SafetyControls(props: SafetyControlsProps) {
  return (
    <section
      className={`ie-safety ie-safety--${props.variant ?? 'live'}`}
      aria-labelledby="safety-controls-title"
    >
      <div className="ie-safety__heading">
        <div>
          <h2 id="safety-controls-title">Comfort</h2>
          <p>These settings remain available while the camera is active.</p>
        </div>
        {props.showCameraActions !== false && (
          <div className="ie-safety__actions">
            <button
              type="button"
              className="ie-btn ie-btn--accent"
              onClick={props.onStart}
              disabled={!props.canStart || props.isRequesting || props.isActive}
              aria-busy={props.isRequesting}
            >
              {props.isRequesting ? 'Requesting camera…' : 'Start camera'}
            </button>
            <button
              type="button"
              className="ie-btn ie-btn--danger"
              onClick={props.onStop}
              disabled={!props.canStop}
            >
              Stop Everything
            </button>
          </div>
        )}
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
          label="Safe Mode"
          description="Limits stronger feedback and effect parameters."
          checked={props.safeMode}
          onChange={props.onSafeModeChange}
        />
        <ToggleField
          id="core-reduced-motion"
          label="Reduced Motion"
          description="Suppresses motion-heavy and temporal effects."
          checked={props.reducedMotion}
          onChange={props.onReducedMotionChange}
        />
      </div>
    </section>
  )
}
