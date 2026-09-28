// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { renderEvidenceMarkdown } from '../../src/content/evidence/markdown'
import { listEvidenceDocPaths, loadEvidenceDoc } from '../../src/content/evidence/documents'

describe('evidence content contracts', () => {
  it('bundles the maintained welcome evidence and each listed document', async () => {
    const paths = listEvidenceDocPaths()
    expect(paths).toContain('docs/references/README.md')
    const documents = await Promise.all(paths.map(loadEvidenceDoc))
    expect(documents.every((text) => typeof text === 'string' && text.length > 0)).toBe(true)
  })

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
