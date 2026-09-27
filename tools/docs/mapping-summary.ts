/**
 * Generate the current dimension, motif, and evidence mapping.
 *
 * Builds `docs/references/MAPPING_SUMMARY.md` listing:
 * - each experience dimension
 * - default motifs/nodes (video + audio) used by dimension mapping
 * - the evidence doc(s) supporting them (rationale_doc + evidence strength)
 *
 * Notes:
 * - This does NOT add new claims; it only points at existing repo docs.
 * - Anything marked evidence_strength "hypothesis" is flagged as experimental.
 *
 * Folded into `npm run evidence:gen` (write) and `npm run evidence:verify` (check);
 * there is no standalone script.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  DimensionToSignalMappingFile,
  ExperienceDimensionsFile,
} from '../../src/domain/experience/schema'
import { loadRepoJson } from './repoJson'
import { motifNodes } from '../contracts/motifs/nodes'
import { dimensionMappingValues } from './dimensionMappingValues'

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
      `- \`${id}\`: missing mapping entry in \`src/content/experience/dimension-to-signal-mapping.json\``,
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
      '- None detected from `src/content/experience/experience-dimensions.json` and `src/content/experience/dimension-to-signal-mapping.json`.',
    )
    return
  }
  if (experimental.length) rows.push('### Experimental (hypothesis)', '', ...experimental, '')
  if (gaps.length) rows.push('### Gaps / missing links', '', ...gaps, '')
}

function buildMappingSummaryMarkdown(root: string) {
  const dimsFile = loadRepoJson<ExperienceDimensionsFile>(
    root,
    'src/content/experience/experience-dimensions.json',
  )
  const mapFile = loadRepoJson<DimensionToSignalMappingFile>(
    root,
    'src/content/experience/dimension-to-signal-mapping.json',
  )

  const dims = Array.isArray(dimsFile.dimensions) ? dimsFile.dimensions : []
  const mapping = mapFile.mapping ?? {}

  const rows: string[] = []
  rows.push('# Dimension, motif, and evidence mapping')
  rows.push('')
  rows.push(
    'The dimension→motif mappings the composer uses, with the evidence links behind each one.',
  )
  rows.push('')
  rows.push(
    '- Non-diagnostic framing: motifs are metaphorical design choices, not clinical simulations.',
  )
  rows.push(
    '- Evidence-bounded: every dimension points to an in-repo rationale doc under `docs/references/dimensions/`.',
  )
  rows.push(
    '- Experimental: anything marked `hypothesis` is an evidence gap. Keep it conservative and off by default.',
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

  return { contents: rows.join('\n'), dimensionCount: dims.length }
}

function mappingSummaryPath(root: string) {
  return join(root, 'docs', 'references', 'MAPPING_SUMMARY.md')
}

export function writeMappingSummary(root: string) {
  const { contents, dimensionCount } = buildMappingSummaryMarkdown(root)
  writeFileSync(mappingSummaryPath(root), contents, 'utf-8')
  console.log(`Wrote docs/references/MAPPING_SUMMARY.md (${dimensionCount} dimensions)`)
}

export function checkMappingSummary(root: string) {
  const { contents } = buildMappingSummaryMarkdown(root)
  const outPath = mappingSummaryPath(root)
  const current = readFileSync(outPath, 'utf-8')
  if (current !== contents) {
    throw new Error(`${outPath} is stale. Regenerate with npm run evidence:gen.`)
  }
}
