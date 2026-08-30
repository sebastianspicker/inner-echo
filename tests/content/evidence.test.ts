// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { renderEvidenceMarkdown } from '../../src/content/evidence/markdown'

describe('evidence content contracts', () => {
  it('sanitizes rendered evidence HTML', () => {
    const { fragment, title } = renderEvidenceMarkdown(
      '# Evidence\n<script>alert(1)</script>\n[unsafe link](javascript:alert(1))',
    )
    const container = document.createElement('div')
    container.append(fragment)

    expect(title).toBe('Evidence')
    expect(container.innerHTML).not.toContain('<script')
    expect(container.innerHTML).not.toContain('javascript:')
  })
})
