export interface ToggleFieldProps {
  id?: string
  label: string
  description?: string
  disabledExplanation?: string
  checked: boolean
  disabled?: boolean
  className?: string
  name?: string
  onChange: (checked: boolean) => void
}

export function ToggleField({
  id,
  label,
  description,
  disabledExplanation,
  checked,
  disabled = false,
  className = 'composer__toggle',
  name,
  onChange,
}: ToggleFieldProps) {
  const controlId = id ?? `toggle-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const descriptionId = description ? `${controlId}-description` : undefined
  const disabledId = disabled && disabledExplanation ? `${controlId}-disabled` : undefined
  return (
    <label className={className} htmlFor={controlId}>
      <input
        id={controlId}
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        aria-describedby={[descriptionId, disabledId].filter(Boolean).join(' ') || undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {label}
        {description && <small id={descriptionId}>{description}</small>}
        {disabledId && <small id={disabledId}>{disabledExplanation}</small>}
      </span>
    </label>
  )
}
