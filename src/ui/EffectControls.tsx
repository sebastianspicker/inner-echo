import type { Profile } from '../conditions/schema'
import { resolveControl, type ResolvedControl } from '../conditions/controlTargets'
import { LabeledSlider } from './controls/LabeledSlider'
import { ToggleField } from './controls/ToggleField'

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

const resolveControls = (profile: Profile, reducedMotion: boolean): ResolvedControl[] => {
  const resolved: ResolvedControl[] = []
  for (const control of profile.ui?.controls ?? []) {
    const candidate = resolveControl(control, profile, { reducedMotion })
    if (candidate) resolved.push(candidate)
  }
  return resolved
}

const resolvedControlValue = (
  control: ResolvedControl,
  props: EffectControlsProps,
): number | boolean => {
  if (control.kind === 'intensity') return props.intensity
  if (control.kind === 'safeMode') return props.safeMode
  if (control.kind === 'reducedMotion') return props.reducedMotion
  if (control.kind === 'audioEnabled') return props.audioEnabled
  return props.controlValues[control.paramKey] ?? control.defaultValue
}

const updateResolvedControl = (
  control: ResolvedControl,
  value: number | boolean,
  props: EffectControlsProps,
): void => {
  if (control.kind === 'intensity') props.onIntensityChange(value as number)
  else if (control.kind === 'safeMode') props.onSafeModeChange(value as boolean)
  else if (control.kind === 'reducedMotion') props.onReducedMotionChange(value as boolean)
  else if (control.kind === 'audioEnabled') props.onAudioEnabledChange(value as boolean)
  else props.onControlValuesChange((prev) => ({ ...prev, [control.paramKey]: value }))
}

const ResolvedEffectControl = ({
  control,
  props,
}: {
  control: ResolvedControl
  props: EffectControlsProps
}) => {
  const value = resolvedControlValue(control, props)
  const onChange = (next: number | boolean) => updateResolvedControl(control, next, props)
  if (control.control.type === 'slider') {
    return (
      <LabeledSlider
        className="ie-control ie-control--range"
        label={control.control.label ?? control.control.id}
        min={control.control.min ?? 0}
        max={control.control.max ?? 1}
        step={control.control.step ?? 0.01}
        value={typeof value === 'number' ? value : 0}
        onChange={onChange as (value: number) => void}
      />
    )
  }
  return (
    <ToggleField
      className="ie-control ie-control--toggle"
      label={control.control.label ?? control.control.id}
      checked={value === true}
      onChange={onChange as (checked: boolean) => void}
    />
  )
}

const ProfileEffectControls = (props: EffectControlsProps) => {
  if (!props.profile?.ui?.controls?.length) {
    return (
      <>
        <LabeledSlider
          className="ie-control ie-control--range"
          label="Intensity"
          min={0}
          max={1}
          step={0.01}
          value={props.intensity}
          onChange={props.onIntensityChange}
        />
        <ToggleField
          className="ie-control ie-control--toggle"
          label="Safe Mode"
          checked={props.safeMode}
          onChange={props.onSafeModeChange}
        />
      </>
    )
  }
  return resolveControls(props.profile, props.reducedMotion).map((control) => (
    <ResolvedEffectControl key={control.control.id} control={control} props={props} />
  ))
}

export function EffectControls(props: EffectControlsProps) {
  return (
    <details className="ie-panelSection">
      <summary className="ie-summary">Controls</summary>
      <div className="ie-panelBody">
        <div className="ie-controlGroup" role="group" aria-label="Effect controls">
          <ProfileEffectControls {...props} />
          <ToggleField
            className="ie-control ie-control--toggle"
            label="Stress Mode (test FPS guard)"
            checked={props.stressMode}
            onChange={props.onStressModeChange}
          />
          <p id="safe-mode-desc" className="ie-controlHint">
            Safe Mode keeps the experience gentle and comfortable.
          </p>
          <p id="stress-mode-desc" className="ie-controlHint">
            Simulates load to trigger resolution scale-down when FPS &lt; 30.
          </p>
        </div>
      </div>
    </details>
  )
}
