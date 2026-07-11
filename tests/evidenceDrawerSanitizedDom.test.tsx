// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'

import { EvidenceDrawer } from '../src/ui/EvidenceDrawer'

vi.mock('../src/evidence/docs', () => ({
  listEvidenceDocPaths: () => ['docs/references/README.md'],
  loadEvidenceDoc: async () => `# Evidence Title

<script>window.__evidenceXss = true</script>
<img src="x" onerror="window.__evidenceXss = true">
Safe content.
`,
}))

afterEach(cleanup)

describe('EvidenceDrawer sanitized DOM', () => {
  it('mounts sanitized evidence without executable elements or attributes', async () => {
    const { container } = render(
      <EvidenceDrawer
        open
        docPath="docs/references/README.md"
        onNavigate={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const evidence = await waitFor(() => {
      const article = container.querySelector('article.evidence-markdown')
      expect(article?.textContent).toContain('Safe content.')
      return article
    })

    expect(evidence?.querySelector('script')).toBeNull()
    expect(evidence?.querySelector('[onerror]')).toBeNull()
  })
})
