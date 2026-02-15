/**
 * Read-only adapter for `src/conditions/dimension-to-signal-mapping.json`.
 *
 * IMPORTANT:
 * - `src/conditions/**` JSON is treated as an API contract (read-only).
 * - We import as raw text (`?raw`) and parse the *first* JSON object defensively.
 */

import rawText from '../conditions/dimension-to-signal-mapping.json?raw'

export type MotifDef = {
  node: string
  params_hint?: Record<string, unknown>
}

export type DimensionSignalMappingEntry = {
  evidence_strength?: string
  rationale_doc?: string
  notes?: string
  safety?: {
    warnings?: string[]
    clamps?: Record<string, unknown>
    reduced_motion?: { disable_nodes?: string[]; note?: string }
  }
  video_motifs?: MotifDef[]
  audio_motifs?: MotifDef[]
  avoid?: Record<string, unknown>
}

export type DimensionToSignalMappingFile = {
  version?: string
  note?: string
  mapping: Record<string, DimensionSignalMappingEntry>
}

function parseFirstJsonObject(text: string): unknown {
  const start = text.indexOf('{')
  if (start < 0) throw new Error('No JSON object start found')
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) {
        escape = false
      } else if (ch === '\\') {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1))
      }
    }
  }
  throw new Error('Unterminated JSON object')
}

export const dimensionToSignalMappingFile = parseFirstJsonObject(rawText) as DimensionToSignalMappingFile

export function getDimensionMappingEntry(dimensionId: string): DimensionSignalMappingEntry | null {
  const m = dimensionToSignalMappingFile?.mapping ?? {}
  const entry = m?.[dimensionId]
  return entry ?? null
}

