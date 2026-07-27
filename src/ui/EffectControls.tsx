import type { Profile } from '../conditions/schema'
import type { ResolvedControl } from '../conditions/controlTargets'
import { LabeledSlider } from './controls/LabeledSlider'
import { ToggleField } from './controls/ToggleField'
import { resolveProfileControls } from './effectControlResolution'

export interface EffectControlsProps {
  profile: Profile | null
  intensity: number
  safeMode: boolean
  stressMode: boolean
  reducedMotion: boolean
  audioEnabled: boolean
  controlValues: Record<string, number | boolean>
  onIntensityChange: (v: number) => void
  onSafeModeChange: (v: boolean) => void
  onStressModeChange: (v: boolean) => void
  onReducedMotionChange: (v: boolean) => void
  onAudioEnabledChange: (v: boolean) => void
  onControlValuesChange: (
    updater: (prev: Record<string, number | boolean>) => Record<string, number | boolean>,
  ) => void
}

const ResolvedEffectControl = ({
  control,
  props,
}: {
  control: ResolvedControl
  props: EffectControlsProps
}) => {
  const value = props.controlValues[control.paramKey] ?? control.defaultValue
  const onChange = (next: number | boolean) =>
    props.onControlValuesChange((previous) => ({ ...previous, [control.paramKey]: next }))

  if (control.control.type === 'slider') {
    return (
      <LabeledSlider
        className="ie-control ie-control--range"
        label={control.control.label ?? control.control.id}
        min={control.control.min ?? 0}
        max={control.control.max ?? 1}
        step={control.control.step ?? 0.01}
        value={typeof value === 'number' ? value : 0}
        onChange={onChange as (next: number) => void}
      />
    )
  }

  return (
    <ToggleField
      className="ie-control ie-control--toggle"
      label={control.control.label ?? control.control.id}
      checked={value === true}
      onChange={onChange as (next: boolean) => void}
    />
  )
}

function ProfileEffectControls(props: EffectControlsProps) {
  const controls = props.profile ? resolveProfileControls(props.profile, props.reducedMotion) : []
  if (controls.length === 0) {
    return <p className="ie-hint">This profile has no additional controls.</p>
  }
  return controls.map((control) => (
    <ResolvedEffectControl key={control.control.id} control={control} props={props} />
  ))
}

export function EffectControls(props: EffectControlsProps) {
  return (
    <details className="ie-panelSection ie-panelSection--effects">
      <summary className="ie-summary">Controls</summary>
      <div className="ie-panelBody">
        <div className="ie-controlGroup" role="group" aria-label="Effect controls">
          <ProfileEffectControls {...props} />
          {import.meta.env.DEV && (
            <ToggleField
              className="ie-control ie-control--toggle"
              label="Stress Mode (test FPS guard)"
              checked={props.stressMode}
              onChange={props.onStressModeChange}
            />
          )}
          {import.meta.env.DEV && (
            <p id="stress-mode-desc" className="ie-controlHint">
              Simulates load to trigger resolution scale-down when FPS &lt; 30.
            </p>
          )}
        </div>
      </div>
    </details>
  )
}
