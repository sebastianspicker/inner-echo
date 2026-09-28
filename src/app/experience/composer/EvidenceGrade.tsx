import type { StrengthBadge } from './selection'

/** Evidence grade as a tally and one word; the full label stays available to assistive tech. */
export function EvidenceGrade({ badge }: { badge: StrengthBadge | null }) {
  if (!badge) return null
  return (
    <span className={badge.className} title={badge.label}>
      <span className="sr-only">{badge.label}</span>
      <span aria-hidden="true">{badge.grade}</span>
    </span>
  )
}
