import { useMemo, useState } from 'react'

import { loadProfile } from '../../../content/experience/loader'
import type {
  ComposerMode,
  ExperienceDimensionDef,
} from '../../../domain/experience/composition/types'
import type { CatalogEntry, Profile } from '../../../domain/experience/schema'
import { logger } from '../../../platform/logger'
import { useAsyncEffect } from './useAsyncEffect'

function evidenceStrengthRank(value: unknown): number {
  return { high: 1, medium: 2, low: 3, hypothesis: 4 }[String(value).toLowerCase()] ?? 0
}

function profileStrength(
  profile: Profile | null,
  dimById: Map<string, ExperienceDimensionDef>,
): string {
  let rank = 0
  for (const dimension of profile?.experience_dimensions ?? []) {
    rank = Math.max(rank, evidenceStrengthRank(dimById.get(dimension.id)?.evidence_strength))
  }
  return ['', 'high', 'medium', 'low', 'hypothesis'][rank] ?? ''
}

export function selectProfileBadgeIds(
  mode: ComposerMode,
  conditionId: string,
  catalog: CatalogEntry[] | null,
): string[] {
  if (mode === 'symptom') return []
  if (mode === 'preset') return conditionId ? [conditionId] : []
  return (catalog ?? []).map((entry) => entry.id)
}

export async function loadProfileBadgeStrengths(
  profileIds: string[],
  dimById: Map<string, ExperienceDimensionDef>,
): Promise<Record<string, string>> {
  const profiles = await Promise.all(profileIds.map((id) => loadProfile(id)))
  return Object.fromEntries(
    profileIds.map((id, index) => [id, profileStrength(profiles[index] ?? null, dimById)]),
  )
}

interface BadgeStrengthState {
  requestKey: string
  strengths: Record<string, string>
}

/** Loads profile-derived badges only for profiles visible in the active composer mode. */
export function useProfileBadgeStrengths(
  mode: ComposerMode,
  conditionId: string,
  catalog: CatalogEntry[] | null,
  dimById: Map<string, ExperienceDimensionDef>,
): Record<string, string> {
  const profileIds = useMemo(
    () => selectProfileBadgeIds(mode, conditionId, catalog),
    [catalog, conditionId, mode],
  )
  const requestKey = profileIds.join('\u0000')
  const [state, setState] = useState<BadgeStrengthState>({ requestKey: '', strengths: {} })

  useAsyncEffect(
    async (ctx) => {
      if (profileIds.length === 0) return
      const strengths = await loadProfileBadgeStrengths(profileIds, dimById)
      if (ctx.cancelled) return
      setState({ requestKey, strengths })
    },
    [dimById, requestKey],
    { onError: (error) => logger.error('Profile badge load failed', error) },
  )

  return state.requestKey === requestKey ? state.strengths : {}
}
