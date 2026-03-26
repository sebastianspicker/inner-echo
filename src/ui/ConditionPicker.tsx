/**
 * Phase 5: Condition picker — dropdown showing catalog label and short description.
 */

import type { CatalogEntry } from '../conditions/schema'
import './ConditionPicker.css'

export interface ConditionPickerProps {
  catalog: CatalogEntry[] | null
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  id?: string
  'aria-label'?: string
}

export function ConditionPicker({
  catalog,
  value,
  onChange,
  disabled = false,
  id = 'condition-picker',
  'aria-label': ariaLabel = 'Experience profile',
}: ConditionPickerProps) {
  const options = catalog ?? []
  return (
    <div className="condition-picker" role="group" aria-label={ariaLabel}>
      <label htmlFor={id} className="condition-picker__label">
        Experience
      </label>
      <select
        id={id}
        className="condition-picker__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-describedby={`${id}-desc`}
      >
        {options.map((entry) => (
          <option key={entry.id} value={entry.id} title={entry.description ?? entry.label}>
            {entry.recommended ? `${entry.label} (recommended)` : entry.label}
          </option>
        ))}
      </select>
      {options.length > 0 && (() => {
        const current = options.find((e) => e.id === value)
        return current?.description ? (
          <p id={`${id}-desc`} className="condition-picker__description">
            {current.description}
          </p>
        ) : null
      })()}
    </div>
  )
}
