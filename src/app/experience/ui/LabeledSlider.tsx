import type { ChangeEvent } from 'react'
import { useCommitOnRelease } from './useCommitOnRelease'

function liveInputProps(value: number, onChange: (value: number) => void) {
  return {
    value,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const next = Number(event.target.value)
      if (Number.isFinite(next)) onChange(next)
    },
  }
}

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
  /** Calls onChange on release instead of on every drag step. */
  commitOnRelease?: boolean
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
  commitOnRelease = false,
  onChange,
}: LabeledSliderProps) {
  const release = useCommitOnRelease(value, onChange)
  const shown = commitOnRelease ? release.draft : value
  const controlProps = commitOnRelease ? release.inputProps : liveInputProps(value, onChange)
  const controlId = id ?? `slider-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const descriptionId = description ? `${controlId}-description` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const valueText =
    formatValue?.(shown) ?? (max <= 1 ? `${Math.round(shown * 100)}%` : `${Math.round(shown)}`)
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
        aria-valuetext={ariaValueText?.(shown) ?? valueText}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        {...controlProps}
      />
      <span className="composer__slider-val">{valueText}</span>
      {error && <small id={errorId}>{error}</small>}
    </label>
  )
}
