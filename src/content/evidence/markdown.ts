import { marked } from 'marked'
import DOMPurify from 'dompurify'

/**
 * Render markdown to safe HTML for in-app evidence viewing.
 * Evidence docs are repo-controlled, but we still sanitize defensively.
 */
export function renderEvidenceMarkdown(md: string): { fragment: DocumentFragment; title: string } {
  const raw = marked.parse(md, {
    gfm: true,
    breaks: false,
    async: false,
  })

  const fragment = DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    RETURN_DOM_FRAGMENT: true,
  })

  // Secure title extraction: read the first line and check if it starts with #.
  // Avoids ReDoS by not using a complex trailing-whitespace greedy regex.
  const firstLine = md.split('\n')[0] || ''
  const titleMatch = firstLine.trim().match(/^#\s+(.+)$/)
  const title = titleMatch?.[1]?.trim() ?? 'Evidence'
  return { fragment, title }
}
