import fs from 'node:fs'
import path from 'node:path'

import { loadRepoJson } from './repoJson'
import type {
  EvidenceMatrixRow,
  ExperienceDimensionDef,
  ScientificSource,
} from './evidencePageFormatting'

export type ExperienceDimensionsFile = {
  version?: string
  note?: string
  dimensions: ExperienceDimensionDef[]
}

export type Profile = {
  id: string
  label: string
  summary?: string
  video_stack?: Array<{ node: string }>
  audio_stack?: { enabled?: boolean; chain?: Array<{ node: string }> }
  experience_dimensions?: Array<{ id: string; weight: number }>
  safety?: { warnings?: string[] }
}

export function loadDimensions(root: string) {
  return (
    loadRepoJson<ExperienceDimensionsFile>(
      root,
      'src/content/experience/experience-dimensions.json',
    ).dimensions ?? []
  )
}

export function loadProfiles(root: string) {
  const profilesDir = path.join(root, 'src/content/experience/profiles')
  const files = fs.readdirSync(profilesDir).filter((file) => file.endsWith('.json'))
  return files.map((file) => loadRepoJson<Profile>(root, `src/content/experience/profiles/${file}`))
}

export function parseEvidenceMatrix(root: string) {
  const filePath = path.join(root, 'docs/references/EVIDENCE_MATRIX.md')
  if (!fs.existsSync(filePath)) return new Map()
  const text = fs.readFileSync(filePath, 'utf-8')
  const out = new Map<string, EvidenceMatrixRow>()
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue
    const columns = line.split('|').map((column) => column.trim())
    if (columns.length < 6) continue
    const dimensionMatch = (columns[1] ?? '').match(/^`?([a-z0-9_]+)`?$/i)
    if (!dimensionMatch?.[1]) continue
    const corpusLink = (columns[5] ?? '').match(/`([^`]+)`/)?.[1]
    out.set(dimensionMatch[1], { dimensionId: dimensionMatch[1], corpusLink })
  }
  return out
}

type PendingCitation = { line: string; dois: string[] }

type CorpusParseState = {
  currentDim: string | null
  inBib: boolean
  pendingCitation: PendingCitation | null
  inMarkdownBlock: boolean
}

function extractDois(text: string) {
  const dois = new Set<string>()
  const expression =
    /(https?:\/\/doi\.org\/(10\.\d{4,9}\/[._;()/:A-Z0-9-]+))|\b(10\.\d{4,9}\/[._;()/:A-Z0-9-]+)\b/gi
  let match = expression.exec(text)
  while (match) {
    const doi = (match[2] ?? match[3] ?? '').trim()
    if (doi) dois.add(doi)
    match = expression.exec(text)
  }
  return Array.from(dois)
}

function addPendingCitation(
  state: CorpusParseState,
  corpusPath: string,
  sourcesByDimension: Map<string, ScientificSource[]>,
) {
  if (!state.currentDim || !state.pendingCitation) return
  const [doi] = state.pendingCitation.dois
  if (!doi) return
  const sources = sourcesByDimension.get(state.currentDim) ?? []
  sources.push({
    citation: state.pendingCitation.line,
    doi,
    doiUrl: `https://doi.org/${doi}`,
    corpusPath,
    dimensionId: state.currentDim,
  })
  sourcesByDimension.set(state.currentDim, sources)
  state.pendingCitation = null
}

function updateMarkdownBlock(state: CorpusParseState, line: string, flush: () => void) {
  if (!line.trimStart().startsWith('```')) return false
  const fence = line.trim()
  if (!state.inMarkdownBlock && fence.toLowerCase().startsWith('```markdown')) {
    state.inMarkdownBlock = true
  } else if (state.inMarkdownBlock) {
    flush()
    state.inMarkdownBlock = false
    state.inBib = false
  }
  return true
}

function dimensionHeading(line: string, inMarkdownBlock: boolean) {
  const fileFor = line.match(/^##\s+File\s+for\s+([a-z0-9_]+)\s*$/i)
  const h1 = inMarkdownBlock ? line.match(/^#\s+([a-z0-9_]+)\s*$/i) : null
  return { fileFor, h1, dimensionId: fileFor?.[1] ?? h1?.[1] }
}

function updateBibliographyState(
  state: CorpusParseState,
  line: string,
  hasDimensionHeading: boolean,
  flush: () => void,
) {
  if (/^##\s+Bibliography\b/i.test(line)) {
    flush()
    state.inBib = true
    return true
  }
  if (state.inBib && /^##\s+/.test(line) && !/^##\s+Bibliography\b/i.test(line)) {
    flush()
    state.inBib = false
    state.currentDim = null
    return true
  }
  if (!state.inBib && /^##\s+/.test(line) && !hasDimensionHeading) {
    state.currentDim = null
    return true
  }
  return false
}

function updatePendingCitation(state: CorpusParseState, line: string, flush: () => void) {
  if (line.startsWith('- ')) {
    flush()
    const citation = line.slice(2).trim()
    const dois = extractDois(citation)
    state.pendingCitation = dois.length ? { line: citation, dois } : null
    return
  }
  if (state.pendingCitation && /^\s*DOI:\s*/i.test(line)) {
    const doi = extractDois(line)[0]
    if (doi && !state.pendingCitation.dois.includes(doi)) state.pendingCitation.dois.unshift(doi)
  }
}

function parseCorpusSourceLine(line: string, state: CorpusParseState, flush: () => void) {
  if (updateMarkdownBlock(state, line, flush)) return
  const heading = dimensionHeading(line, state.inMarkdownBlock)
  if (heading.dimensionId) {
    flush()
    state.currentDim = heading.dimensionId.toLowerCase()
    state.inBib = false
    return
  }
  if (!state.currentDim) return
  if (updateBibliographyState(state, line, Boolean(heading.fileFor || heading.h1), flush)) return
  if (state.inBib) updatePendingCitation(state, line, flush)
}

function parseCorpusSourceFile(
  root: string,
  corpusPath: string,
  sourcesByDimension: Map<string, ScientificSource[]>,
) {
  const filePath = path.join(root, corpusPath)
  if (!fs.existsSync(filePath)) return
  const state: CorpusParseState = {
    currentDim: null,
    inBib: false,
    pendingCitation: null,
    inMarkdownBlock: false,
  }
  const flush = () => addPendingCitation(state, corpusPath, sourcesByDimension)
  for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
    parseCorpusSourceLine(line, state, flush)
  }
  flush()
}

function deduplicateSourcesByDimension(sourcesByDimension: Map<string, ScientificSource[]>) {
  for (const [dimensionId, sources] of sourcesByDimension.entries()) {
    const seen = new Set<string>()
    sourcesByDimension.set(
      dimensionId,
      sources.filter((source) => {
        if (seen.has(source.doi)) return false
        seen.add(source.doi)
        return true
      }),
    )
  }
}

export function parseCorpusSourcesByDimension(root: string) {
  const corpusPaths = [
    'docs/references/research/initial-dimensions.md',
    'docs/references/research/remaining-dimensions.md',
  ]
  const sourcesByDimension = new Map<string, ScientificSource[]>()
  for (const corpusPath of corpusPaths) parseCorpusSourceFile(root, corpusPath, sourcesByDimension)
  deduplicateSourcesByDimension(sourcesByDimension)
  return sourcesByDimension
}
