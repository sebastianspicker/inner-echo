import {
  nodeTechnicalSummary,
  strengthLabel,
  type ExperienceDimensionDef,
} from './evidencePageFormatting'
import type { Profile } from './evidencePageParsing'

export type DimensionReference = {
  id: string
  label: string
  strength: string
  doc: string
}

export type ConditionReference = {
  id: string
  label: string
  doc: string
}

export type ConditionPageModel = {
  aggregateLabel: string
  dimensions: Array<DimensionReference & { weight: number }>
  motifs: Array<{ id: string; summary: string; doc: string }>
  profile: Profile
  warnings: string[]
}

function normalizeStrength(strength?: string) {
  const normalized = String(strength ?? '').toLowerCase()
  if (normalized === 'high') return 'high'
  if (normalized === 'medium') return 'medium'
  if (normalized === 'low') return 'low'
  if (normalized === 'hypothesis') return 'hypothesis'
  return 'unrated'
}

function conditionStrength(
  dimensions: Array<{ id: string; weight: number }>,
  dimensionsById: Map<string, ExperienceDimensionDef>,
) {
  const strengthRank: Record<string, number> = {
    hypothesis: 0,
    low: 1,
    medium: 2,
    high: 3,
    unrated: 4,
  }
  const rankToStrength = ['hypothesis', 'low', 'medium', 'high', 'unrated'] as const
  let minimumRank = strengthRank.unrated
  for (const dimension of dimensions) {
    const strength = normalizeStrength(dimensionsById.get(dimension.id)?.evidence_strength)
    minimumRank = Math.min(minimumRank, strengthRank[strength] ?? strengthRank.unrated)
  }
  const aggregate = rankToStrength[minimumRank] ?? 'unrated'
  return strengthLabel(aggregate === 'unrated' ? undefined : aggregate)
}

export function profileMotifs(profile: Profile): string[] {
  const video = profile.video_stack?.map((entry) => entry.node) ?? []
  const audio = profile.audio_stack?.enabled
    ? (profile.audio_stack.chain?.map((entry) => entry.node) ?? [])
    : []
  return Array.from(new Set([...video, ...audio])).sort()
}

function dimensionReferences(
  dimensions: Array<{ id: string; weight: number }>,
  dimensionsById: Map<string, ExperienceDimensionDef>,
) {
  return dimensions.map((dimension) => {
    const definition = dimensionsById.get(dimension.id)
    return {
      id: dimension.id,
      label: definition?.label ?? dimension.id,
      strength: strengthLabel(definition?.evidence_strength),
      doc: definition?.rationale_doc ?? `docs/references/dimensions/${dimension.id}.md`,
      weight: dimension.weight,
    }
  })
}

export function deriveConditionPageModel(
  profile: Profile,
  dimensionsById: Map<string, ExperienceDimensionDef>,
): ConditionPageModel {
  const dimensions = (profile.experience_dimensions ?? [])
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
  return {
    aggregateLabel: conditionStrength(dimensions, dimensionsById),
    dimensions: dimensionReferences(dimensions, dimensionsById),
    motifs: profileMotifs(profile).map((id) => ({
      id,
      summary: nodeTechnicalSummary(id),
      doc: `docs/references/motifs/${id}.md`,
    })),
    profile,
    warnings: profile.safety?.warnings ?? [],
  }
}

export function allMotifs(dimensions: ExperienceDimensionDef[], profiles: Profile[] = []) {
  const motifs = new Set<string>()
  for (const dimension of dimensions) {
    for (const node of dimension.motif_summary?.video_nodes ?? []) motifs.add(node)
    for (const node of dimension.motif_summary?.audio_nodes ?? []) motifs.add(node)
  }
  for (const profile of profiles) {
    for (const motif of profileMotifs(profile)) motifs.add(motif)
  }
  return Array.from(motifs)
}

export function usedByDimensions(motif: string, dimensions: ExperienceDimensionDef[]) {
  return dimensions.flatMap((dimension) => {
    const nodes = [
      ...(dimension.motif_summary?.video_nodes ?? []),
      ...(dimension.motif_summary?.audio_nodes ?? []),
    ]
    if (!nodes.includes(motif)) return []
    return [
      {
        id: dimension.id,
        label: dimension.label,
        strength: strengthLabel(dimension.evidence_strength),
        doc: dimension.rationale_doc ?? `docs/references/dimensions/${dimension.id}.md`,
      },
    ]
  })
}

export function usedByConditions(motif: string, profiles: Profile[]) {
  return profiles.flatMap((profile) => {
    if (!profileMotifs(profile).includes(motif)) return []
    return [
      { id: profile.id, label: profile.label, doc: `docs/references/conditions/${profile.id}.md` },
    ]
  })
}
