import { useMemo, useState } from 'react'
import type { CatalogEntry } from '../../../domain/experience/schema'
import { loadProfile } from '../../../content/experience/loader'
import type { ExperienceDimensionDef } from '../../../domain/experience/composition/types'
import { logger } from '../../../platform/logger'
import { useAsyncEffect } from './useAsyncEffect'

function evidenceStrengthRank(value: unknown): number {
  return { high: 1, medium: 2, low: 3, hypothesis: 4 }[String(value).toLowerCase()] ?? 0
}

function profileStrength(
  profile: Awaited<ReturnType<typeof loadProfile>>,
  dimById: Map<string, ExperienceDimensionDef>,
): string {
  let rank = 0
  for (const dimension of profile?.experience_dimensions ?? []) {
    rank = Math.max(rank, evidenceStrengthRank(dimById.get(dimension.id)?.evidence_strength))
  }
  return ['', 'high', 'medium', 'low', 'hypothesis'][rank] ?? ''
}

async function loadConditionStrengths(
  catalogIds: string[],
  dimById: Map<string, ExperienceDimensionDef>,
): Promise<Record<string, string>> {
  const profiles = await Promise.all(catalogIds.map((id) => loadProfile(id)))
  return Object.fromEntries(
    catalogIds.map((id, index) => [id, profileStrength(profiles[index], dimById)]),
  )
}

/** Loads evidence-strength badges for the currently available condition catalog. */
export function useConditionStrengths(
  catalog: CatalogEntry[] | null,
  dimById: Map<string, ExperienceDimensionDef>,
): Record<string, string> {
  const [conditionStrength, setConditionStrength] = useState<Record<string, string>>({})
  const catalogIds = useMemo(() => (catalog ?? []).map((entry) => entry.id), [catalog])

  useAsyncEffect(
    async (ctx) => {
      const strengths = await loadConditionStrengths(catalogIds, dimById)
      if (ctx.cancelled) return
      setConditionStrength(strengths)
    },
    [catalogIds, dimById],
    { onError: (err) => logger.error('ExperienceComposerPanel loadProfile failed', err) },
  )

  return conditionStrength
}
