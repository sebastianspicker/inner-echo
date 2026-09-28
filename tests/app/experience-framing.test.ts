import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ExperienceFraming } from '../../src/app/experience/composer/ExperienceFraming'
import { strengthBadge } from '../../src/app/experience/composer/selection'

describe('experience framing', () => {
  it('shows the loaded description and distinguishes experience evidence from effect validation', () => {
    const markup = renderToStaticMarkup(
      createElement(ExperienceFraming, {
        profile: { summary: 'A selected experience description.' },
        isLoading: false,
      }),
    )

    expect(markup).toContain('A selected experience description.')
    expect(markup).toContain('artistic interpretations')
    expect(markup).toContain('Experiences vary from person to person')
    expect(markup).toContain('not validation of these effects')
    expect(markup).toContain('not a reproduction')
    expect(markup).toContain('or a diagnostic tool')
    expect(markup).toContain('<summary>What the evidence supports</summary>')
  })

  it('does not present a previous description as the selection loads', () => {
    const markup = renderToStaticMarkup(
      createElement(ExperienceFraming, {
        profile: { summary: 'Previous description.' },
        isLoading: true,
      }),
    )

    expect(markup).not.toContain('Previous description.')
    expect(markup).not.toContain('No experience description is available.')
    expect(markup).toContain('artistic interpretations')
  })

  it.each([null, { summary: '   ' }])('handles an unavailable description (%j)', (profile) => {
    const markup = renderToStaticMarkup(
      createElement(ExperienceFraming, { profile, isLoading: false }),
    )

    expect(markup).toContain('No experience description is available.')
    expect(markup).toContain('artistic interpretations')
  })

  it.each(['high', 'medium', 'low'])('scopes the %s evidence label to experience', (strength) => {
    expect(strengthBadge(strength)?.label).toBe(`Experience evidence: ${strength}`)
  })

  it('keeps hypotheses and missing evidence distinct', () => {
    expect(strengthBadge('hypothesis')?.label).toBe('Experience hypothesis (evidence gap)')
    expect(strengthBadge()).toBeNull()
  })
})
