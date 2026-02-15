import { marked } from 'marked'
import DOMPurify from 'dompurify'

/**
 * Render markdown to safe HTML for in-app evidence viewing.
 * Evidence docs are repo-controlled, but we still sanitize defensively.
 */
export function renderEvidenceMarkdown(md: string): { html: string; title: string } {
  const raw = marked.parse(md, {
    gfm: true,
    breaks: false,
  }) as string

  const html = DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
  })

  const titleMatch = md.match(/^#\s+(.+)\s*$/m)
  const title = titleMatch?.[1]?.trim() ?? 'Evidence'
  return { html, title }
}

