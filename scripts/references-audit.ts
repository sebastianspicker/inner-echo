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
import type {
  DimensionToSignalMappingFile,
  ExperienceDimensionsFile,
} from '../src/conditions/schema'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const uniq = (xs: string[]): string[] => {
  return Array.from(new Set(xs.filter(Boolean)))
}

const mdEscape = (s: string): string => {
  return s.replace(/\|/g, '\\|')
}

const appendHeader = (rows: string[]): void => {
  rows.push('# References audit (dimensions → motifs → evidence)', '')
  rows.push(
    'This file enumerates the **evidence-linked** dimension→motif mappings used by the composer.',
    '',
    '- **Non-diagnostic framing**: motifs are metaphorical design choices, not clinical simulations.',
    '- **Evidence-bounded**: each dimension points to in-repo rationale docs under `docs/references/dimensions/`.',
    '- **Experimental**: anything marked `hypothesis` should be treated as an evidence gap and kept conservative / off-by-default.',
    '',
    'See also: `docs/references/EVIDENCE_MATRIX.md`.',
    '',
    '## Matrix',
    '',
    '| Dimension | Evidence | Rationale doc | Video motifs (nodes) | Audio motifs (nodes) |',
    '|---|---|---|---|---|',
  )
}

const motifList = (motifs: Array<{ node?: string }>): string => {
  return uniq(motifs.map((motif) => String(motif.node ?? '').trim())).join(', ')
}

const markdownCell = (value: string): string => {
  return value ? `\`${mdEscape(value)}\`` : '—'
}

const appendDimensionFindings = (
  gaps: string[],
  experimental: string[],
  id: string,
  label: string,
  strength: string,
  doc: string,
  hasMapping: boolean,
): void => {
  if (!hasMapping)
    gaps.push(
      `- \`${id}\`: missing mapping entry in \`src/conditions/dimension-to-signal-mapping.json\``,
    )
  if (!doc) gaps.push(`- \`${id}\`: missing rationale_doc (no evidence link available)`)
  if (strength.toLowerCase() === 'hypothesis')
    experimental.push(
      `- \`${id}\` (${label}): hypothesis (evidence gap) — keep conservative / experimental`,
    )
}

const dimensionRowText = (
  id: string,
  label: string,
  strength: string,
  doc: string,
  video: string,
  audio: string,
): string => {
  return `| **${mdEscape(label)}** (\`${id}\`) | ${mdEscape(strength)} | ${markdownCell(doc)} | ${markdownCell(video)} | ${markdownCell(audio)} |`
}

type DimensionRowInfo = {
  id: string
  label: string
  strength: string
  doc: string
  video: string
  audio: string
  hasMapping: boolean
}

const dimensionRowInfo = (
  mapping: DimensionToSignalMappingFile['mapping'],
  dimension: ExperienceDimensionsFile['dimensions'][number],
): DimensionRowInfo => {
  const id = String(dimension.id ?? '').trim()
  const label = String(dimension.label ?? id)
  const entry = mapping[id]
  return {
    id,
    label,
    strength:
      String(entry?.evidence_strength ?? dimension.evidence_strength ?? '').trim() || 'unknown',
    doc: String(entry?.rationale_doc ?? dimension.rationale_doc ?? '').trim(),
    video: motifList(entry?.video_motifs ?? []),
    audio: motifList(entry?.audio_motifs ?? []),
    hasMapping: Boolean(entry),
  }
}

const appendDimensionRow = (
  rows: string[],
  gaps: string[],
  experimental: string[],
  mapping: DimensionToSignalMappingFile['mapping'],
  dimension: ExperienceDimensionsFile['dimensions'][number],
): void => {
  const info = dimensionRowInfo(mapping, dimension)
  if (!info.id) return
  appendDimensionFindings(
    gaps,
    experimental,
    info.id,
    info.label,
    info.strength,
    info.doc,
    info.hasMapping,
  )
  rows.push(dimensionRowText(info.id, info.label, info.strength, info.doc, info.video, info.audio))
}

const appendFindings = (rows: string[], gaps: string[], experimental: string[]): void => {
  rows.push('', '## Hypotheses / evidence gaps', '')
  if (!experimental.length && !gaps.length) {
    rows.push(
      '- None detected from `src/conditions/experience-dimensions.json` and `src/conditions/dimension-to-signal-mapping.json`.',
      '',
    )
    return
  }
  if (experimental.length) rows.push('### Experimental (hypothesis)', '', ...experimental, '')
  if (gaps.length) rows.push('### Gaps / missing links', '', ...gaps, '')
}

const main = (): void => {
  const dimsFile = loadJson<ExperienceDimensionsFile>('src/conditions/experience-dimensions.json')
  const mapFile = loadJson<DimensionToSignalMappingFile>(
    'src/conditions/dimension-to-signal-mapping.json',
  )

  const dims = Array.isArray(dimsFile.dimensions) ? dimsFile.dimensions : []
  const mapping = mapFile.mapping ?? {}

  const rows: string[] = []
  appendHeader(rows)
  const gaps: string[] = []
  const experimental: string[] = []
  for (const dimension of dims) appendDimensionRow(rows, gaps, experimental, mapping, dimension)
  appendFindings(rows, gaps, experimental)

  const outPath = join(ROOT, 'docs', 'REFERENCES_AUDIT.md')
  writeFileSync(outPath, rows.join('\n'), 'utf-8')
  console.log(`Wrote docs/REFERENCES_AUDIT.md (${dims.length} dimensions)`)
}

const loadJson = <T>(pathFromRoot: string): T => {
  return parseFirstJsonObject(readFileSync(join(ROOT, pathFromRoot), 'utf-8'))
}

main()
