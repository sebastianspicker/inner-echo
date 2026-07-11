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

export function EffectControls({
  profile,
  intensity,
  safeMode,
  stressMode,
  reducedMotion,
  audioEnabled,
  controlValues,
  onIntensityChange,
  onSafeModeChange,
  onStressModeChange,
  onReducedMotionChange,
  onAudioEnabledChange,
  onControlValuesChange,
}: EffectControlsProps) {
  return (
    <details className="ie-panelSection">
      <summary className="ie-summary">Controls</summary>
      <div className="ie-panelBody">
        <div className="ie-controlGroup" role="group" aria-label="Effect controls">
          {profile?.ui?.controls?.length ? (
            (() => {
              const resolved: ResolvedControl[] = []
              const controls = profile.ui?.controls ?? []
              for (const c of controls) {
                const r = resolveControl(c, profile, { reducedMotion })
                if (
                  r &&
                  r.kind !== 'intensity' &&
                  r.kind !== 'safeMode' &&
                  r.kind !== 'reducedMotion' &&
                  r.kind !== 'audioEnabled'
                ) {
                  resolved.push(r)
                }
              }
              return resolved.map((r) => {
                const value =
                  r.kind === 'intensity'
                    ? intensity
                    : r.kind === 'safeMode'
                      ? safeMode
                      : r.kind === 'reducedMotion'
                        ? reducedMotion
                        : r.kind === 'audioEnabled'
                          ? audioEnabled
                          : ((controlValues[r.paramKey] ?? r.defaultValue) as number | boolean)
                const onChange = (v: number | boolean) => {
                  if (r.kind === 'intensity') onIntensityChange(v as number)
                  else if (r.kind === 'safeMode') onSafeModeChange(v as boolean)
                  else if (r.kind === 'reducedMotion') onReducedMotionChange(v as boolean)
                  else if (r.kind === 'audioEnabled') onAudioEnabledChange(v as boolean)
                  else onControlValuesChange((prev) => ({ ...prev, [r.paramKey]: v }))
                }
                if (r.control.type === 'slider') {
                  const num = typeof value === 'number' ? value : 0
                  const min = r.control.min ?? 0
                  const max = r.control.max ?? 1
                  const step = r.control.step ?? 0.01
                  return (
                    <LabeledSlider
                      key={r.control.id}
                      className="ie-control ie-control--range"
                      label={r.control.label ?? r.control.id}
                      min={min}
                      max={max}
                      step={step}
                      value={num}
                      onChange={onChange as (value: number) => void}
                    />
                  )
                }
                return (
                  <ToggleField
                    key={r.control.id}
                    className="ie-control ie-control--toggle"
                    label={r.control.label ?? r.control.id}
                    checked={value === true}
                    onChange={onChange as (checked: boolean) => void}
                  />
                )
              })
            })()
          ) : (
            <p className="ie-hint">This profile has no additional controls.</p>
          )}
          {import.meta.env.DEV && (
            <ToggleField
              className="ie-control ie-control--toggle"
              label="Stress Mode (test FPS guard)"
              checked={stressMode}
              onChange={onStressModeChange}
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
