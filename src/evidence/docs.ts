/**
 * Evidence docs loader for the website/app.
 *
 * Loads markdown files bundled with the app (no external navigation required).
 */

import { logger } from '../utils/logger'

export type EvidenceDocPath = `docs/${string}.md`

// Bundle all evidence markdown under docs/references/** plus the audit at docs/REFERENCES_AUDIT.md.
const EVIDENCE_DOC_MODULES = import.meta.glob<string>(
  ['../../docs/references/**/*.md', '../../docs/REFERENCES_AUDIT.md'],
  { query: '?raw', import: 'default' },
)
const evidenceDocLoaders = new Map(Object.entries(EVIDENCE_DOC_MODULES))

function toKey(docPath: EvidenceDocPath): string {
  // Convert "docs/..." to "../../docs/..." which is how we globbed.
  return `../../${docPath}`
}

function isAllowedEvidenceDocPath(docPath: string): docPath is EvidenceDocPath {
  if (docPath === 'docs/REFERENCES_AUDIT.md') return true
  if (!docPath.startsWith('docs/references/') || !docPath.endsWith('.md')) return false
  const segments = docPath.split('/')
  return segments.every(
    (segment) =>
      segment !== '' && segment !== '.' && segment !== '..' && /^[A-Za-z0-9._-]+$/.test(segment),
  )
}

export async function loadEvidenceDoc(docPath: EvidenceDocPath): Promise<string | null> {
  if (!isAllowedEvidenceDocPath(docPath)) {
    logger.warn('loadEvidenceDoc rejected invalid path', docPath)
    return null
  }
  const key = toKey(docPath)
  const loader = evidenceDocLoaders.get(key)
  if (!loader) return null
  try {
    return await loader()
  } catch (err) {
    logger.warn('loadEvidenceDoc failed', docPath, err)
    return null
  }
}

export function listEvidenceDocPaths(): EvidenceDocPath[] {
  const out: EvidenceDocPath[] = []
  for (const k of Object.keys(EVIDENCE_DOC_MODULES)) {
    // k like "../../docs/references/INDEX.md"
    const idx = k.indexOf('../../docs/')
    if (idx < 0) continue
    const p = k.slice('../../'.length) as EvidenceDocPath
    out.push(p)
  }
  out.sort((a, b) => a.localeCompare(b))
  return out
}
