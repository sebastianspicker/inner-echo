import { clamp01 } from '../../../shared/numbers'
import type {
  SelectedPreset,
  SelectedDimension,
} from '../../../domain/experience/composition/types'
import type { CatalogEntry } from '../../../domain/experience/schema'

export function upsertPreset(
  list: SelectedPreset[],
  profileId: string,
  weight: number,
  enabled: boolean,
): SelectedPreset[] {
  return upsertKeyed(list, profileId, weight, enabled, 'profileId')
}

export function upsertDimension(
  list: SelectedDimension[],
  dimensionId: string,
  weight: number,
  enabled: boolean,
): SelectedDimension[] {
  return upsertKeyed(list, dimensionId, weight, enabled, 'dimensionId')
}

function upsertKeyed<T extends { weight: number }, K extends keyof T & string>(
  list: T[],
  id: string,
  weight: number,
  enabled: boolean,
  key: K,
): T[] {
  const next = list.slice()
  const idx = next.findIndex((item) => String(item[key]) === id)
  if (!enabled) {
    if (idx >= 0) next.splice(idx, 1)
    return next
  }
  const item = { [key]: id, weight: clamp01(weight) } as T
  if (idx >= 0) next[idx] = item
  else next.push(item)
  next.sort((a, b) => String(a[key]).localeCompare(String(b[key])))
  return next
}

export interface StrengthBadge {
  /** Full accessible label; states that the grade concerns the experience, not the effect. */
  label: string
  /** The grade word shown beside the tally. */
  grade: string
  className: string
}

export function strengthBadge(strength?: string): StrengthBadge | null {
  if (!strength) return null
  const s = String(strength).toLowerCase()
  if (s === 'high' || s === 'medium' || s === 'low')
    return {
      label: `Experience evidence: ${s}`,
      grade: s,
      className: `composer__badge composer__badge--${s}`,
    }
  if (s === 'hypothesis')
    return {
      label: 'Experience hypothesis (evidence gap)',
      grade: 'hypothesis',
      className: 'composer__badge composer__badge--hyp',
    }
  return {
    label: `Experience evidence: ${strength}`,
    grade: strength,
    className: 'composer__badge',
  }
}

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
