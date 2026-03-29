/**
 * Scientific accuracy guardrails: Evidence audit output.
 *
 * Generates `docs/REFERENCES_AUDIT.md` listing:
 * - each experience dimension
 * - default motifs/nodes (video + audio) used by dimension mapping
 * - the evidence doc(s) supporting them (rationale_doc + evidence strength)
 *
 * Notes:
 * - This does NOT add new claims; it only points at existing repo docs.
 * - Anything marked evidence_strength "hypothesis" is flagged as experimental.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { parseFirstJsonObject } from '../src/utils/jsonObjectParser'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function loadJson(pathFromRoot: string): any {
  return parseFirstJsonObject(readFileSync(join(ROOT, pathFromRoot), 'utf-8'))
}

function uniq(xs: string[]): string[] {
  return Array.from(new Set(xs.filter(Boolean)))
}

function mdEscape(s: string): string {
  return s.replace(/\|/g, '\\|')
}

function main(): void {
  const dimsFile = loadJson('src/conditions/experience-dimensions.json')
  const mapFile = loadJson('src/conditions/dimension-to-signal-mapping.json')

  const dims: Array<any> = Array.isArray(dimsFile.dimensions) ? dimsFile.dimensions : []
  const mapping: Record<string, any> = mapFile.mapping ?? {}

  const rows: string[] = []
  rows.push('# References audit (dimensions → motifs → evidence)')
  rows.push('')
  rows.push(
    'This file enumerates the **evidence-linked** dimension→motif mappings used by the composer.',
  )
  rows.push('')
  rows.push(
    '- **Non-diagnostic framing**: motifs are metaphorical design choices, not clinical simulations.',
  )
  rows.push(
    '- **Evidence-bounded**: each dimension points to in-repo rationale docs under `docs/references/dimensions/`.',
  )
  rows.push(
    '- **Experimental**: anything marked `hypothesis` should be treated as an evidence gap and kept conservative / off-by-default.',
  )
  rows.push('')
  rows.push('See also: `docs/references/EVIDENCE_MATRIX.md`.')
  rows.push('')
  rows.push('## Matrix')
  rows.push('')
  rows.push(
    '| Dimension | Evidence | Rationale doc | Video motifs (nodes) | Audio motifs (nodes) |',
  )
  rows.push('|---|---|---|---|---|')

  const gaps: string[] = []
  const experimental: string[] = []

  for (const d of dims) {
    const id = String(d.id ?? '').trim()
    if (!id) continue
    const label = String(d.label ?? id)
    const defStrength = String(d.evidence_strength ?? '').trim()
    const defDoc = String(d.rationale_doc ?? '').trim()
    const entry = mapping[id]
    const strength = String(entry?.evidence_strength ?? defStrength ?? '').trim() || 'unknown'
    const doc = String(entry?.rationale_doc ?? defDoc ?? '').trim() || ''
    const vNodes = uniq(
      (entry?.video_motifs ?? []).map((m: any) => String(m.node ?? '').trim()),
    ).join(', ')
    const aNodes = uniq(
      (entry?.audio_motifs ?? []).map((m: any) => String(m.node ?? '').trim()),
    ).join(', ')

    if (!entry)
      gaps.push(
        `- \`${id}\`: missing mapping entry in \`src/conditions/dimension-to-signal-mapping.json\``,
      )
    if (!doc) gaps.push(`- \`${id}\`: missing rationale_doc (no evidence link available)`)
    if (strength.toLowerCase() === 'hypothesis')
      experimental.push(
        `- \`${id}\` (${label}): hypothesis (evidence gap) — keep conservative / experimental`,
      )

    rows.push(
      `| **${mdEscape(label)}** (\`${id}\`) | ${mdEscape(strength)} | ${doc ? `\`${mdEscape(doc)}\`` : '—'} | ${vNodes ? `\`${mdEscape(vNodes)}\`` : '—'} | ${aNodes ? `\`${mdEscape(aNodes)}\`` : '—'} |`,
    )
  }

  rows.push('')
  rows.push('## Hypotheses / evidence gaps')
  rows.push('')
  if (experimental.length === 0 && gaps.length === 0) {
    rows.push(
      '- None detected from `src/conditions/experience-dimensions.json` and `src/conditions/dimension-to-signal-mapping.json`.',
    )
  } else {
    if (experimental.length) {
      rows.push('### Experimental (hypothesis)')
      rows.push('')
      rows.push(...experimental)
      rows.push('')
    }
    if (gaps.length) {
      rows.push('### Gaps / missing links')
      rows.push('')
      rows.push(...gaps)
      rows.push('')
    }
  }

  const outPath = join(ROOT, 'docs', 'REFERENCES_AUDIT.md')
  writeFileSync(outPath, rows.join('\n'), 'utf-8')
  console.log(`Wrote docs/REFERENCES_AUDIT.md (${dims.length} dimensions)`)
}

main()
