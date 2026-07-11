export interface LabeledSliderProps {
  id?: string
  label: string
  description?: string
  error?: string
  disabled?: boolean
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
  id,
  label,
  description,
  error,
  disabled = false,
  value,
  min,
  max,
  step = 0.01,
  formatValue,
  ariaValueText,
  className = 'composer__slider',
  onChange,
}: LabeledSliderProps) {
  const controlId = id ?? `slider-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const descriptionId = description ? `${controlId}-description` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const valueText =
    formatValue?.(value) ?? (max <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}`)
  return (
    <label className={className} htmlFor={controlId}>
      <span>
        {label}
        {description && <small id={descriptionId}>{description}</small>}
      </span>
      <input
        id={controlId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={ariaValueText?.(value) ?? valueText}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isFinite(n)) return
          onChange(n)
        }}
      />
      <span className="composer__slider-val">{valueText}</span>
      {error && <small id={errorId}>{error}</small>}
    </label>
  )
}
