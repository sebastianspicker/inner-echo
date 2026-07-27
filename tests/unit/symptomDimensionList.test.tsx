// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ExperienceDimensionDef } from '../../src/composer'
import { SymptomDimensionList } from '../../src/ui/SymptomDimensionList'

afterEach(cleanup)

const dims: ExperienceDimensionDef[] = [
  {
    id: 'visual_detachment',
    label: 'Visual detachment',
    description: 'Scene feels far away and unreal.',
    evidence_strength: 'medium',
    rationale_doc: 'docs/references/dimensions/visual_detachment.md',
  },
  {
    id: 'ringing',
    label: 'Ringing',
    description: 'Persistent tonal presence.',
  },
]

describe('ui/SymptomDimensionList', () => {
  it('toggles dimensions, updates weights, renders summaries, and resolves evidence fallbacks', () => {
    const onDimensionsChange = vi.fn()
    const onOpenEvidence = vi.fn()
    const dimById = new Map(dims.map((dim) => [dim.id, dim]))
    const { rerender } = render(
      <SymptomDimensionList
        dims={dims}
        dimById={dimById}
        dimIds={new Set<string>()}
        dimensions={[]}
        onDimensionsChange={onDimensionsChange}
        onOpenEvidence={onOpenEvidence}
      />,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: /visual detachment/i }))
    expect(onDimensionsChange).toHaveBeenCalledWith([
      { dimensionId: 'visual_detachment', weight: 0.5 },
    ])
    expect(screen.getByText('Evidence: medium')).toBeInTheDocument()

    rerender(
      <SymptomDimensionList
        dims={dims}
        dimById={dimById}
        dimIds={new Set(['visual_detachment', 'ringing'])}
        dimensions={[
          { dimensionId: 'visual_detachment', weight: 0.3 },
          { dimensionId: 'ringing', weight: 0.75 },
        ]}
        onDimensionsChange={onDimensionsChange}
        onOpenEvidence={onOpenEvidence}
      />,
    )

    fireEvent.change(screen.getByRole('slider', { name: /weight for visual detachment/i }), {
      target: { value: '0.7' },
    })
    expect(onDimensionsChange).toHaveBeenLastCalledWith([
      { dimensionId: 'ringing', weight: 0.75 },
      { dimensionId: 'visual_detachment', weight: 0.7 },
    ])

    expect(screen.getByLabelText('Selected dimensions summary')).toBeInTheDocument()
    expect(screen.getAllByText('Visual detachment')).toHaveLength(2)
    expect(screen.getAllByText('Ringing')).toHaveLength(2)

    const evidenceButtons = screen.getAllByRole('button', { name: /open evidence doc/i })
    fireEvent.click(evidenceButtons[0])
    expect(onOpenEvidence).toHaveBeenCalledWith('docs/references/dimensions/visual_detachment.md')

    fireEvent.click(evidenceButtons.at(-1) as HTMLButtonElement)
    expect(onOpenEvidence).toHaveBeenCalledWith('docs/references/dimensions/ringing.md')
  })
})
