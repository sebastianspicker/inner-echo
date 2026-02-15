/**
 * Read-only adapters for condition dimension metadata.
 *
 * IMPORTANT:
 * - `src/conditions/**` JSON is treated as an API contract (read-only).
 * - This module only reads and re-exports structured data for the composer/UI.
 */
// IMPORTANT: we import as text (`?raw`) so we can tolerate accidental extra content
// in the source file without modifying `src/conditions/**` (read-only contract).
import rawText from '../conditions/experience-dimensions.json?raw'

export type EvidenceStrength = 'high' | 'medium' | 'low' | 'hypothesis' | string

export type ExperienceDimensionDef = {
  id: string
  label: string
  description: string
  safety?: string[]
  evidence_strength?: EvidenceStrength
  rationale_doc?: string
  motif_summary?: {
    video_nodes?: string[]
    audio_nodes?: string[]
  }
}

export type ExperienceDimensionsFile = {
  version?: string
  note?: string
  dimensions: ExperienceDimensionDef[]
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
        const slice = text.slice(start, i + 1)
        return JSON.parse(slice)
      }
    }
  }
  throw new Error('Unterminated JSON object')
}

export const experienceDimensionsFile = parseFirstJsonObject(rawText) as ExperienceDimensionsFile

export function getExperienceDimensions(): ExperienceDimensionDef[] {
  const dims = experienceDimensionsFile?.dimensions ?? []
  return Array.isArray(dims) ? dims.slice() : []
}

