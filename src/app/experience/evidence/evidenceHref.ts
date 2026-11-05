import type { EvidenceDocPath } from '../../../content/evidence'

function normalizeHref(href: string): string {
  return href.trim().split('#')[0]?.trim() ?? ''
}

function resolveDocumentPath(normalized: string): EvidenceDocPath {
  return (normalized.endsWith('.md') ? normalized : `${normalized}.md`) as EvidenceDocPath
}

function resolveRelativeDocumentPath(
  current: EvidenceDocPath,
  normalized: string,
): EvidenceDocPath | null {
  const baseDir = current.slice(0, current.lastIndexOf('/') + 1)
  const baseUrl = `https://evidence.local/${baseDir}`
  try {
    const url = new URL(normalized, baseUrl)
    const path = url.pathname.replace(/^\//, '')
    return path.startsWith('docs/') && path.endsWith('.md') ? (path as EvidenceDocPath) : null
  } catch {
    return null
  }
}

export function resolveEvidenceHref(
  current: EvidenceDocPath,
  href: string,
): EvidenceDocPath | null {
  if (href.trim().startsWith('#')) return current
  const normalized = normalizeHref(href)
  if (!normalized) return null
  if (normalized.startsWith('docs/')) return resolveDocumentPath(normalized)
  // Anything with a scheme (https:, mailto:) or an absolute path leaves the drawer.
  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized) || normalized.startsWith('/')) return null
  // `INDEX.md`, `research/x.md`, `./x.md` and `../x.md` are relative to the current document.
  return resolveRelativeDocumentPath(current, normalized)
}
