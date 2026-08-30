/**
 * Evidence docs loader for the website/app.
 *
 * Loads markdown files bundled with the app (no external navigation required).
 */

import { logger } from '../../platform/logger'

export type EvidenceDocPath = `docs/${string}.md`

// Bundle the maintained evidence documents for same-origin, offline navigation.
const EVIDENCE_DOC_MODULES = import.meta.glob<string>('../../docs/references/**/*.md', {
  query: '?raw',
  import: 'default',
})

function toKey(docPath: EvidenceDocPath): string {
  // Convert "docs/..." to "../../docs/..." which is how we globbed.
  return `../../${docPath}`
}

export async function loadEvidenceDoc(docPath: EvidenceDocPath): Promise<string | null> {
  const key = toKey(docPath)
  const loader = (EVIDENCE_DOC_MODULES as Record<string, (() => Promise<string>) | undefined>)[key]
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
