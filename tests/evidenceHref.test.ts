import { describe, expect, it } from 'vitest'
import { resolveEvidenceHref } from '../src/ui/evidenceHref'

describe('ui/evidenceHref', () => {
  const current = 'docs/references/conditions/anxiety.md' as const

  it('resolves in-document anchors to current doc', () => {
    expect(resolveEvidenceHref(current, '#section-a')).toBe(current)
  })

  it('strips hash fragments for docs paths', () => {
    expect(resolveEvidenceHref(current, 'docs/references/README.md#intro')).toBe(
      'docs/references/README.md'
    )
  })

  it('resolves relative links with anchors', () => {
    expect(resolveEvidenceHref(current, '../README.md#top')).toBe('docs/references/README.md')
  })

  it('rejects non-doc external links', () => {
    expect(resolveEvidenceHref(current, 'https://example.com')).toBe(null)
  })
})

