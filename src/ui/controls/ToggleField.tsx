export interface ToggleFieldProps {
  label: string
  checked: boolean
  disabled?: boolean
  className?: string
  name?: string
  onChange: (checked: boolean) => void
}

export function ToggleField({
  label,
  checked,
  disabled = false,
  className = 'composer__toggle',
  name,
  onChange,
}: ToggleFieldProps) {
  return (
    <label className={className}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}
