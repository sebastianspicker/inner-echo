// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MultimorbidPresetList } from '../../src/ui/MultimorbidPresetList'
import type { CatalogEntry } from '../../src/conditions/schema'

afterEach(cleanup)

const catalog: CatalogEntry[] = [
  {
    id: 'dpdr',
    label: 'DPDR',
    description: 'Depersonalisation and derealisation',
  },
  {
    id: 'tinnitus',
    label: 'Tinnitus',
    description: 'Persistent ringing',
  },
]

describe('ui/MultimorbidPresetList', () => {
  it('toggles presets, updates weights, and opens evidence docs', () => {
    const onPresetsChange = vi.fn()
    const onOpenEvidence = vi.fn()
    const { rerender } = render(
      <MultimorbidPresetList
        catalog={catalog}
        presetIds={new Set<string>()}
        presets={[]}
        conditionStrength={{ dpdr: 'high' }}
        onPresetsChange={onPresetsChange}
        onOpenEvidence={onOpenEvidence}
      />,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: /dpdr/i }))
    expect(onPresetsChange).toHaveBeenCalledWith([{ profileId: 'dpdr', weight: 0.5 }])
    expect(screen.getByText('Evidence: high')).toBeInTheDocument()

    rerender(
      <MultimorbidPresetList
        catalog={catalog}
        presetIds={new Set(['dpdr'])}
        presets={[{ profileId: 'dpdr', weight: 0.4 }]}
        conditionStrength={{ dpdr: 'high' }}
        onPresetsChange={onPresetsChange}
        onOpenEvidence={onOpenEvidence}
      />,
    )

    fireEvent.change(screen.getByRole('slider', { name: /weight for dpdr/i }), {
      target: { value: '0.9' },
    })
    expect(onPresetsChange).toHaveBeenLastCalledWith([{ profileId: 'dpdr', weight: 0.9 }])

    fireEvent.click(screen.getByRole('button', { name: /docs\/references\/conditions\/dpdr\.md/i }))
    expect(onOpenEvidence).toHaveBeenCalledWith('docs/references/conditions/dpdr.md')

    fireEvent.click(screen.getByRole('checkbox', { name: /dpdr/i }))
    expect(onPresetsChange).toHaveBeenLastCalledWith([])
  })
})
