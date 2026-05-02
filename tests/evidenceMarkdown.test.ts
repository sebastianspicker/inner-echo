// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { renderEvidenceMarkdown } from '../src/evidence/markdown'

describe('evidence/markdown', () => {
  it('sanitizes active HTML while preserving the markdown title', () => {
    const { html, title } = renderEvidenceMarkdown(`# Evidence Title

<script>alert('xss')</script>
<img src="x" onerror="alert('xss')">
[unsafe link](javascript:alert('xss'))
<a href="javascript:alert('xss')">unsafe html link</a>
`)

    const normalized = html.toLowerCase()
    expect(title).toBe('Evidence Title')
    expect(normalized).not.toContain('<script')
    expect(normalized).not.toContain('onerror')
    expect(normalized).not.toContain('href="javascript:')
  })
})
