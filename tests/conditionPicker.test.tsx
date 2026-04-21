// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ConditionPicker } from '../src/ui/ConditionPicker'
import type { CatalogEntry } from '../src/conditions/schema'

afterEach(cleanup)

const mockCatalog: CatalogEntry[] = [
  { id: 'dpdr', label: 'DPDR', description: 'Depersonalisation / Derealisation' },
  {
    id: 'tinnitus',
    label: 'Tinnitus',
    description: 'Phantom auditory perception',
    recommended: true,
  },
  { id: 'migraine', label: 'Migraine' },
]

describe('ui/ConditionPicker', () => {
  it('renders all catalog entries as options', () => {
    render(<ConditionPicker catalog={mockCatalog} value="dpdr" onChange={vi.fn()} />)
    const select = screen.getByRole('combobox', { name: /experience/i })
    expect(select).toBeInTheDocument()

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
  })

  it('marks recommended entries with "(recommended)" suffix', () => {
    render(<ConditionPicker catalog={mockCatalog} value="dpdr" onChange={vi.fn()} />)
    const options = screen.getAllByRole('option')
    const tinnitus = options.find((o) => o.textContent?.includes('Tinnitus'))
    expect(tinnitus?.textContent).toBe('Tinnitus (recommended)')
  })

  it('renders non-recommended entries without suffix', () => {
    render(<ConditionPicker catalog={mockCatalog} value="dpdr" onChange={vi.fn()} />)
    const options = screen.getAllByRole('option')
    const dpdr = options.find((o) => o.textContent?.includes('DPDR'))
    expect(dpdr?.textContent).toBe('DPDR')
  })

  it('shows description for the currently selected condition', () => {
    render(<ConditionPicker catalog={mockCatalog} value="dpdr" onChange={vi.fn()} />)
    expect(screen.getByText('Depersonalisation / Derealisation')).toBeInTheDocument()
  })

  it('does not show description when selected entry has none', () => {
    render(<ConditionPicker catalog={mockCatalog} value="migraine" onChange={vi.fn()} />)
    // The description paragraph should not exist
    const desc = document.getElementById('condition-picker-desc')
    expect(desc).toBeNull()
  })

  it('calls onChange with the selected option value', () => {
    const onChange = vi.fn()
    render(<ConditionPicker catalog={mockCatalog} value="dpdr" onChange={onChange} />)
    const select = screen.getByRole('combobox', { name: /experience/i })
    fireEvent.change(select, { target: { value: 'tinnitus' } })
    expect(onChange).toHaveBeenCalledWith('tinnitus')
  })

  it('disables select when disabled prop is true', () => {
    render(<ConditionPicker catalog={mockCatalog} value="dpdr" onChange={vi.fn()} disabled />)
    const select = screen.getByRole('combobox', { name: /experience/i })
    expect(select).toBeDisabled()
  })

  it('renders empty select when catalog is null', () => {
    render(<ConditionPicker catalog={null} value="" onChange={vi.fn()} />)
    const options = screen.queryAllByRole('option')
    expect(options).toHaveLength(0)
  })

  it('renders empty select when catalog is empty array', () => {
    render(<ConditionPicker catalog={[]} value="" onChange={vi.fn()} />)
    const options = screen.queryAllByRole('option')
    expect(options).toHaveLength(0)
  })
})
