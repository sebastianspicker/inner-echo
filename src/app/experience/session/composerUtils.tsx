import { clamp01 } from '../../../shared/numbers'
import type {
  SelectedPreset,
  SelectedDimension,
} from '../../../domain/experience/composition/types'
import type { EvidenceDocPath } from '../../../content/evidence'

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

export function strengthBadge(strength?: string): { label: string; className: string } | null {
  if (!strength) return null
  const s = String(strength).toLowerCase()
  if (s === 'high')
    return {
      label: 'Experience evidence: high',
      className: 'composer__badge composer__badge--high',
    }
  if (s === 'medium')
    return {
      label: 'Experience evidence: medium',
      className: 'composer__badge composer__badge--medium',
    }
  if (s === 'low')
    return { label: 'Experience evidence: low', className: 'composer__badge composer__badge--low' }
  if (s === 'hypothesis')
    return {
      label: 'Experience hypothesis (evidence gap)',
      className: 'composer__badge composer__badge--hyp',
    }
  return { label: `Experience evidence: ${strength}`, className: 'composer__badge' }
}

export function EvidenceButton({
  doc,
  onOpen,
}: {
  doc?: string
  onOpen: (docPath: EvidenceDocPath) => void
}) {
  if (!doc) return null
  return (
    <button
      type="button"
      className="composer__evidenceBtn"
      onClick={() => onOpen(doc as EvidenceDocPath)}
      aria-label={`Open evidence doc ${doc}`}
      title={doc}
    >
      Evidence
    </button>
  )
}
