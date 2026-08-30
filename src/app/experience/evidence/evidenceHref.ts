import type { EvidenceDocPath } from '../../../content/evidence'

function normalizeHref(href: string): string {
  return href.trim().split('#')[0]?.trim() ?? ''
}

export function resolveEvidenceHref(
  current: EvidenceDocPath,
  href: string,
): EvidenceDocPath | null {
  if (href.trim().startsWith('#')) return current
  const normalized = normalizeHref(href)
  if (!normalized) return null
  if (normalized.startsWith('docs/')) {
    return (normalized.endsWith('.md') ? normalized : `${normalized}.md`) as EvidenceDocPath
  }
  if (normalized.startsWith('./') || normalized.startsWith('../')) {
    // Resolve against current doc directory.
    const baseDir = current.slice(0, current.lastIndexOf('/') + 1)
    const baseUrl = `https://evidence.local/${baseDir}`
    try {
      const u = new URL(normalized, baseUrl)
      const p = u.pathname.replace(/^\//, '')
      if (p.startsWith('docs/') && p.endsWith('.md')) return p as EvidenceDocPath
      return null
    } catch {
      return null
    }
  }
  return null
}
