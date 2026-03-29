export interface LabeledSliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  formatValue?: (value: number) => string
  ariaValueText?: (value: number) => string
  className?: string
  onChange: (value: number) => void
}

export function LabeledSlider({
  label,
  value,
  min,
  max,
  step = 0.01,
  formatValue,
  ariaValueText,
  className = 'composer__slider',
  onChange,
}: LabeledSliderProps) {
  const valueText =
    formatValue?.(value) ?? (max <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}`)
  return (
    <label className={className}>
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={ariaValueText?.(value) ?? valueText}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isFinite(n)) return
          onChange(n)
        }}
      />
      <span className="composer__slider-val">{valueText}</span>
    </label>
  )
}
