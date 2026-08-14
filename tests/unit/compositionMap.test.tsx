// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CompositionMap } from '../../src/ui/CompositionMap'

describe('CompositionMap', () => {
  it('renders weighted nodes without CSP-blocked inline styles', () => {
    const { container } = render(
      <CompositionMap
        mode="multimorbid"
        conditionId="none"
        dimensions={[]}
        presets={[
          { profileId: 'first_profile', weight: 0.23 },
          { profileId: 'second_profile', weight: 1 },
        ]}
      />,
    )

    expect(screen.getByText('first profile').parentElement).toHaveClass(
      'composition-map__node--position-1',
      'composition-map__node--strength-25',
    )
    expect(screen.getByText('second profile').parentElement).toHaveClass(
      'composition-map__node--position-2',
      'composition-map__node--strength-100',
    )
    expect(container.querySelector('[style]')).not.toBeInTheDocument()
  })
})
