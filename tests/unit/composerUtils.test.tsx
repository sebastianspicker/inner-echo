// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import {
  EvidenceButton,
  strengthBadge,
  upsertDimension,
  upsertPreset,
} from '../../src/ui/composerUtils'

afterEach(cleanup)

describe('ui/composerUtils', () => {
  it('upsertPreset adds, clamps, sorts, updates, and removes presets', () => {
    const added = upsertPreset([], 'zeta', 1.4, true)
    expect(added).toEqual([{ profileId: 'zeta', weight: 1 }])

    const sorted = upsertPreset(added, 'alpha', -0.2, true)
    expect(sorted).toEqual([
      { profileId: 'alpha', weight: 0 },
      { profileId: 'zeta', weight: 1 },
    ])

    const updated = upsertPreset(sorted, 'alpha', 0.42, true)
    expect(updated).toEqual([
      { profileId: 'alpha', weight: 0.42 },
      { profileId: 'zeta', weight: 1 },
    ])

    expect(upsertPreset(updated, 'alpha', 0.42, false)).toEqual([{ profileId: 'zeta', weight: 1 }])
  })

  it('upsertDimension adds, clamps, sorts, updates, and removes dimensions', () => {
    const added = upsertDimension([], 'visual_noise', 0.8, true)
    expect(added).toEqual([{ dimensionId: 'visual_noise', weight: 0.8 }])

    const sorted = upsertDimension(added, 'anxiety', Number.POSITIVE_INFINITY, true)
    expect(sorted).toEqual([
      { dimensionId: 'anxiety', weight: 0 },
      { dimensionId: 'visual_noise', weight: 0.8 },
    ])

    const updated = upsertDimension(sorted, 'visual_noise', 0.35, true)
    expect(updated).toEqual([
      { dimensionId: 'anxiety', weight: 0 },
      { dimensionId: 'visual_noise', weight: 0.35 },
    ])

    expect(upsertDimension(updated, 'anxiety', 0.2, false)).toEqual([
      { dimensionId: 'visual_noise', weight: 0.35 },
    ])
  })

  it('returns the correct evidence badges', () => {
    expect(strengthBadge()).toBeNull()
    expect(strengthBadge('HIGH')).toEqual({
      label: 'Evidence: high',
      className: 'composer__badge composer__badge--high',
    })
    expect(strengthBadge('medium')).toEqual({
      label: 'Evidence: medium',
      className: 'composer__badge composer__badge--medium',
    })
    expect(strengthBadge('low')).toEqual({
      label: 'Evidence: low',
      className: 'composer__badge composer__badge--low',
    })
    expect(strengthBadge('hypothesis')).toEqual({
      label: 'Hypothesis (evidence gap)',
      className: 'composer__badge composer__badge--hyp',
    })
    expect(strengthBadge('emerging')).toEqual({
      label: 'Evidence: emerging',
      className: 'composer__badge',
    })
  })

  it('renders evidence buttons only when a doc exists and forwards clicks', () => {
    const onOpen = vi.fn()
    const { rerender } = render(<EvidenceButton onOpen={onOpen} />)

    expect(screen.queryByRole('button', { name: /open evidence doc/i })).not.toBeInTheDocument()

    rerender(<EvidenceButton doc="docs/references/conditions/dpdr.md" onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /docs\/references\/conditions\/dpdr\.md/i }))

    expect(onOpen).toHaveBeenCalledWith('docs/references/conditions/dpdr.md')
  })
})
