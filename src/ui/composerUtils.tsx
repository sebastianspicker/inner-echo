import { clamp01 } from '../utils/numeric'
import type { SelectedPreset, SelectedDimension } from '../composer'
import type { EvidenceDocPath } from '../evidence/docs'

export function upsertPreset(list: SelectedPreset[], profileId: string, weight: number, enabled: boolean): SelectedPreset[] {
  const next = list.slice()
  const idx = next.findIndex((p) => p.profileId === profileId)
  if (!enabled) {
    if (idx >= 0) next.splice(idx, 1)
    return next
  }
  const item: SelectedPreset = { profileId, weight: clamp01(weight) }
  if (idx >= 0) next[idx] = item
  else next.push(item)
  next.sort((a, b) => a.profileId.localeCompare(b.profileId))
  return next
}

export function upsertDimension(
  list: SelectedDimension[],
  dimensionId: string,
  weight: number,
  enabled: boolean
): SelectedDimension[] {
  const next = list.slice()
  const idx = next.findIndex((d) => d.dimensionId === dimensionId)
  if (!enabled) {
    if (idx >= 0) next.splice(idx, 1)
    return next
  }
  const item: SelectedDimension = { dimensionId, weight: clamp01(weight) }
  if (idx >= 0) next[idx] = item
  else next.push(item)
  next.sort((a, b) => a.dimensionId.localeCompare(b.dimensionId))
  return next
}

export function strengthBadge(strength?: string): { label: string; className: string } | null {
  if (!strength) return null
  const s = String(strength).toLowerCase()
  if (s === 'high') return { label: 'Evidence: high', className: 'composer__badge composer__badge--high' }
  if (s === 'medium') return { label: 'Evidence: medium', className: 'composer__badge composer__badge--medium' }
  if (s === 'low') return { label: 'Evidence: low', className: 'composer__badge composer__badge--low' }
  if (s === 'hypothesis') return { label: 'Hypothesis (evidence gap)', className: 'composer__badge composer__badge--hyp' }
  return { label: `Evidence: ${strength}`, className: 'composer__badge' }
}

export function EvidenceButton({ doc, onOpen }: { doc?: string; onOpen: (docPath: EvidenceDocPath) => void }) {
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
