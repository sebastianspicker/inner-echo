/**
 * Generate the current dimension, motif, and evidence mapping.
 *
 * Generates `docs/references/MAPPING_SUMMARY.md` listing:
 * - each experience dimension
 * - default motifs/nodes (video + audio) used by dimension mapping
 * - the evidence doc(s) supporting them (rationale_doc + evidence strength)
 *
 * Notes:
 * - This does NOT add new claims; it only points at existing repo docs.
 * - Anything marked evidence_strength "hypothesis" is flagged as experimental.
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  DimensionToSignalMappingFile,
  ExperienceDimensionsFile,
} from '../../src/conditions/schema'
import { loadRepoJson } from '../lib/repoJson'
import { motifNodes } from '../lib/motifNodes'
import { dimensionMappingValues } from '../lib/dimensionMappingValues'

const ROOT = process.cwd()

function uniq(xs: string[]) {
  return Array.from(new Set(xs.filter(Boolean)))
}

function mdEscape(s: string) {
  return s.replace(/\|/g, '\\|')
}

function mapDimension(
  dimension: ExperienceDimensionsFile['dimensions'][number],
  mapping: DimensionToSignalMappingFile['mapping'],
  rows: string[],
  gaps: string[],
  experimental: string[],
) {
  const { id, label, entry, strength, doc } = dimensionMappingValues(dimension, mapping)
  if (!id) return
  const videoNodes = motifNodes(entry, 'video')
  const audioNodes = motifNodes(entry, 'audio')
  if (!entry)
    gaps.push(
      `- \`${id}\`: missing mapping entry in \`src/conditions/dimension-to-signal-mapping.json\``,
    )
  if (!doc) gaps.push(`- \`${id}\`: missing rationale_doc (no evidence link available)`)
  if (strength.toLowerCase() === 'hypothesis') {
    experimental.push(
      `- \`${id}\` (${label}): hypothesis (evidence gap): keep conservative / experimental`,
    )
  }
  rows.push(
    `| ${mdEscape(label)} (\`${id}\`) | ${mdEscape(strength)} | ${doc ? `\`${mdEscape(doc)}\`` : '-'} | ${videoNodes ? `\`${mdEscape(videoNodes)}\`` : '-'} | ${audioNodes ? `\`${mdEscape(audioNodes)}\`` : '-'} |`,
  )
}

function appendMappingFindings(rows: string[], experimental: string[], gaps: string[]) {
  rows.push('', '## Hypotheses / evidence gaps', '')
  if (experimental.length === 0 && gaps.length === 0) {
    rows.push(
      '- None detected from `src/conditions/experience-dimensions.json` and `src/conditions/dimension-to-signal-mapping.json`.',
    )
    return
  }
  if (experimental.length) rows.push('### Experimental (hypothesis)', '', ...experimental, '')
  if (gaps.length) rows.push('### Gaps / missing links', '', ...gaps, '')
}

function main() {
  const dimsFile = loadRepoJson<ExperienceDimensionsFile>(
    ROOT,
    'src/conditions/experience-dimensions.json',
  )
  const mapFile = loadRepoJson<DimensionToSignalMappingFile>(
    ROOT,
    'src/conditions/dimension-to-signal-mapping.json',
  )

  const dims = Array.isArray(dimsFile.dimensions) ? dimsFile.dimensions : []
  const mapping = mapFile.mapping ?? {}

  const rows: string[] = []
  rows.push('# Dimension, motif, and evidence mapping')
  rows.push('')
  rows.push(
    'This file enumerates the evidence-linked dimension→motif mappings used by the composer.',
  )
  rows.push('')
  rows.push(
    '- Non-diagnostic framing: motifs are metaphorical design choices, not clinical simulations.',
  )
  rows.push(
    '- Evidence-bounded: each dimension points to in-repo rationale docs under `docs/references/dimensions/`.',
  )
  rows.push(
    '- Experimental: anything marked `hypothesis` should be treated as an evidence gap and kept conservative and off by default.',
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

  for (const dimension of dims) mapDimension(dimension, mapping, rows, gaps, experimental)
  appendMappingFindings(rows, experimental, gaps)

  const outPath = join(ROOT, 'docs', 'references', 'MAPPING_SUMMARY.md')
  writeFileSync(outPath, rows.join('\n'), 'utf-8')
  console.log(`Wrote docs/references/MAPPING_SUMMARY.md (${dims.length} dimensions)`)
}

main()
