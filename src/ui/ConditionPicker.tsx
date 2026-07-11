/**
 * Condition picker: dropdown showing catalog label and short description.
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
  'aria-label': ariaLabel,
}: ConditionPickerProps) {
  const options = catalog ?? []
  const selected = options.find((entry) => entry.id === value)
  const selectedMissing = value.length > 0 && !selected
  return (
    <div className="condition-picker">
      <label htmlFor={id} className="condition-picker__label">
        Experience
      </label>
      <select
        id={id}
        className="condition-picker__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={`${id}-desc`}
      >
        {selectedMissing && <option value={value}>{value} (unavailable)</option>}
        {options.map((entry) => (
          <option key={entry.id} value={entry.id} title={entry.description ?? entry.label}>
            {entry.recommended ? `${entry.label} (recommended)` : entry.label}
          </option>
        ))}
      </select>
      {selected?.description ? (
        <p id={`${id}-desc`} className="condition-picker__description">
          {selected.description}
        </p>
      ) : selectedMissing ? (
        <p id={`${id}-desc`} className="condition-picker__description">
          Selected experience is unavailable in the current catalog.
        </p>
      ) : null}
    </div>
  )
}
