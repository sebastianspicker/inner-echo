/**
 * JSON Object Extraction
 *
 * Extracts JSON payloads from unpredictable sources (e.g., raw LLM text responses).
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

function extractBalancedObject(text: string, start: number): string | null {
  if (text[start] !== '{') return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

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

  const tryAccept = (value: unknown): T | null => {
    if (!isRecord(value)) return null
    if (!predicate(value)) return null
    return value as T
  }

  const trimmed = source.trim()
  if (trimmed.length > 0) {
    try {
      const parsed = JSON.parse(trimmed)
      const accepted = tryAccept(parsed)
      if (accepted != null) return accepted
    } catch {
      // fall through to balanced-object scanning
    }
  }

  for (let start = source.indexOf('{'); start >= 0; start = source.indexOf('{', start + 1)) {
    const slice = extractBalancedObject(source, start)
    if (!slice) continue
    try {
      const parsed = JSON.parse(slice)
      const accepted = tryAccept(parsed)
      if (accepted != null) return accepted
    } catch {
      // keep scanning next candidate
    }
  }

  throw new Error('No valid JSON object found')
}
