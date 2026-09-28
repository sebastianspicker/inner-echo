/** Stable identity for validated JSON data; array order remains significant. */
export function canonicalJson(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry
    return Object.fromEntries(
      Object.entries(entry).sort(([left], [right]) => left.localeCompare(right)),
    )
  })
}
