import type { Profile } from '../conditions/schema'
import { resolveControl, type ResolvedControl } from '../conditions/controlTargets'

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
    onControlValuesChange: (updater: (prev: Record<string, number | boolean>) => Record<string, number | boolean>) => void
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
                <div className="camera-view__controls" role="group" aria-label="Effect controls">
                    {profile?.ui?.controls?.length
                        ? (() => {
                            const resolved: ResolvedControl[] = []
                            const controls = profile.ui?.controls ?? []
                            for (const c of controls) {
                                const r = resolveControl(c, profile)
                                if (r) resolved.push(r)
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
                                                    : (controlValues[r.paramKey] ?? r.defaultValue) as number | boolean
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
                                        <label key={r.control.id} className="camera-view__control">
                                            <span className="camera-view__control-label">{r.control.label ?? r.control.id}</span>
                                            <input
                                                type="range"
                                                min={min}
                                                max={max}
                                                step={step}
                                                value={num}
                                                onChange={(e) => {
                                                    const n = Number(e.target.value)
                                                    if (!Number.isFinite(n)) return
                                                    onChange(n)
                                                }}
                                                aria-valuemin={min}
                                                aria-valuemax={max}
                                                aria-valuenow={num}
                                                aria-valuetext={`${Math.round(num * 100)}%`}
                                            />
                                        </label>
                                    )
                                }
                                return (
                                    <label key={r.control.id} className="camera-view__control camera-view__control--toggle">
                                        <input
                                            type="checkbox"
                                            checked={value === true}
                                            onChange={(e) => onChange(e.target.checked)}
                                            aria-describedby={r.kind === 'safeMode' ? 'safe-mode-desc' : undefined}
                                        />
                                        <span>{r.control.label ?? r.control.id}</span>
                                    </label>
                                )
                            })
                        })()
                        : (
                            <>
                                <label className="camera-view__control">
                                    <span className="camera-view__control-label">Intensity</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={Math.round(intensity * 100)}
                                        onChange={(e) => {
                                            const n = Number(e.target.value)
                                            if (!Number.isFinite(n)) return
                                            onIntensityChange(n / 100)
                                        }}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={Math.round(intensity * 100)}
                                        aria-valuetext={`${Math.round(intensity * 100)}%`}
                                    />
                                </label>
                                <label className="camera-view__control camera-view__control--toggle">
                                    <input
                                        type="checkbox"
                                        checked={safeMode}
                                        onChange={(e) => onSafeModeChange(e.target.checked)}
                                        aria-describedby="safe-mode-desc"
                                    />
                                    <span>Safe Mode</span>
                                </label>
                            </>
                        )}
                    <label className="camera-view__control camera-view__control--toggle">
                        <input
                            type="checkbox"
                            checked={stressMode}
                            onChange={(e) => onStressModeChange(e.target.checked)}
                            aria-describedby="stress-mode-desc"
                        />
                        <span>Stress Mode (test FPS guard)</span>
                    </label>
                    <p id="safe-mode-desc" className="camera-view__control-hint">
                        Limits effect strength so it stays comfortable.
                    </p>
                    <p id="stress-mode-desc" className="camera-view__control-hint">
                        Simulates load to trigger resolution scale-down when FPS &lt; 30.
                    </p>
                </div>
            </div>
        </details>
    )
}
