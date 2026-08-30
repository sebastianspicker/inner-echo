/**
 * JSON Object Extraction
 *
 * Extracts JSON payloads from unpredictable sources such as mixed prose and tool output.
 *
 * Unlike a plain `JSON.parse()`, this utility can extract a valid JSON object
 * even when it is wrapped in markdown code blocks (e.g., \`\`\`json { ... } \`\`\`) or
 * preceded by conversational text.
 */

function stripBom(value: string): string {
  return value.startsWith('\uFEFF') ? value.slice(1) : value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

import { extractBalancedObject } from './jsonObjectScanner'

export interface ParseFirstJsonObjectOptions {
  predicate?: (value: unknown) => boolean
}

/**
 * Parse JSON from contract text with fallback extraction:
 * 1) direct parse for clean JSON
 * 2) fallback to first balanced object candidate in raw text
 *
 * @remarks
 * The generic T is not runtime-validated. When T is a specific shape, pass a
 * predicate that validates it (e.g. a type guard) so invalid data is rejected.
 */
/** Maximum input length to prevent excessive memory/CPU usage. */
const MAX_INPUT_LENGTH = 1_048_576 // 1 MiB

export function parseFirstJsonObject<T = unknown>(
  text: string,
  options: ParseFirstJsonObjectOptions = {},
): T {
  const source = stripBom(String(text ?? ''))
  if (source.length > MAX_INPUT_LENGTH) {
    throw new Error(`Input too large (${source.length} chars, max ${MAX_INPUT_LENGTH})`)
  }
  const predicate = options.predicate ?? (() => true)

  const trimmed = source.trim()
  if (trimmed.length > 0) {
    const accepted = tryParseAndAccept<T>(trimmed, predicate)
    if (accepted != null) return accepted
  }

  for (let start = source.indexOf('{'); start >= 0; start = source.indexOf('{', start + 1)) {
    const slice = extractBalancedObject(source, start)
    if (!slice) continue
    const accepted = tryParseAndAccept<T>(slice, predicate)
    if (accepted != null) return accepted
  }

  throw new Error('No valid JSON object found')
}

function acceptRecord<T>(value: unknown, predicate: (value: unknown) => boolean): T | null {
  return isRecord(value) && predicate(value) ? (value as T) : null
}

function tryParseAndAccept<T>(text: string, predicate: (value: unknown) => boolean): T | null {
  try {
    return acceptRecord(JSON.parse(text), predicate)
  } catch {
    return null
  }
}
