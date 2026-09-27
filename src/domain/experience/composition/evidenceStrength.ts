/**
 * Pure evidence-strength ranking shared by badge/summary presentation. Operates only on
 * schema-derived types, so it stays in the domain alongside `EvidenceStrength`.
 */
import type { Profile } from '../schema'
import type { EvidenceStrength, ExperienceDimensionDef } from './types'

const RANK_BY_STRENGTH: Record<string, number> = { high: 1, medium: 2, low: 3, hypothesis: 4 }

export function evidenceStrengthRank(value: unknown): number {
  return RANK_BY_STRENGTH[String(value).toLowerCase()] ?? 0
}

const STRENGTH_BY_RANK: (EvidenceStrength | '')[] = ['', 'high', 'medium', 'low', 'hypothesis']

/** The strongest evidence rating among a profile's experience dimensions, or '' if none. */
export function profileStrength(
  profile: Profile | null,
  dimById: Map<string, ExperienceDimensionDef>,
): string {
  let rank = 0
  for (const dimension of profile?.experience_dimensions ?? []) {
    rank = Math.max(rank, evidenceStrengthRank(dimById.get(dimension.id)?.evidence_strength))
  }
  return STRENGTH_BY_RANK[rank] ?? ''
}
