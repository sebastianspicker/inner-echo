import type { CatalogEntry } from '../conditions/schema'

export function filterCatalog(
  catalog: CatalogEntry[] | null,
  conditionId: string,
  query: string,
): CatalogEntry[] {
  const normalizedQuery = query.trim().toLowerCase()
  const all = catalog ?? []
  if (!normalizedQuery) return all
  const matches = all.filter((entry) => {
    const haystack =
      `${entry.label} ${entry.description ?? ''} ${entry.id} ${(entry.tags ?? []).join(' ')}`.toLowerCase()
    return haystack.includes(normalizedQuery)
  })
  if (matches.some((entry) => entry.id === conditionId)) return matches
  const selected = all.find((entry) => entry.id === conditionId)
  return selected ? [selected, ...matches] : matches
}
