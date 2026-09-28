/**
 * Private composition phases extracted from composeCore to keep its public
 * orchestration boundary small while retaining deterministic composition rules.
 */

import type { AudioStackConfig, Profile, VideoStackNodeDef } from '../schema'
import { normalizeNodeType } from './composeBlend'
import { getInteractionGain } from './interactionMatrix'
import {
  clamp01,
  type ComposerSettings,
  type SelectedDimension,
  type SelectedPreset,
} from './types'
import type { ComposeReport, ComposeSources, CompositionCapabilities } from './contracts'
import {
  collectAudioContributions,
  collectVideoContributions,
  type LoadedProfile,
} from './stackContributions'
import { finalizeAudioStack, finalizeVideoStack } from './stackFinalization'

export function cleanSelectedPresets(presets: SelectedPreset[]): SelectedPreset[] {
  return cleanWeightedSelections(
    presets,
    (preset) => preset.profileId,
    (profileId, weight) => ({ profileId, weight }),
  )
}

export function cleanSelectedDimensions(dimensions: SelectedDimension[]): SelectedDimension[] {
  return cleanWeightedSelections(
    dimensions,
    (dimension) => dimension.dimensionId,
    (dimensionId, weight) => ({ dimensionId, weight }),
  )
}

function cleanWeightedSelections<T extends { weight: number }>(
  selections: T[],
  getId: (selection: T) => unknown,
  create: (id: string, weight: number) => T,
): T[] {
  return (Array.isArray(selections) ? selections : [])
    .filter((selection) => selection && typeof selection === 'object')
    .map((selection) => {
      const id = String(getId(selection) ?? '').trim()
      const weight = clamp01(typeof selection.weight === 'number' ? selection.weight : 0)
      return create(id, weight)
    })
    .filter((selection) => {
      const id = String(getId(selection) ?? '')
      return id && id !== 'undefined' && selection.weight > 0
    })
    .sort((left, right) => String(getId(left)).localeCompare(String(getId(right))))
}

export function deriveEffectiveDimensionWeights(
  dimensions: SelectedDimension[],
  settings: ComposerSettings,
): Map<string, number> {
  if (dimensions.length < 2 || clamp01(settings.interactionAmount) === 0) {
    return new Map(dimensions.map((dimension) => [dimension.dimensionId, dimension.weight]))
  }
  const effectiveWeights = new Map<string, number>()
  for (const dimension of dimensions) {
    const sumGain = dimensions.reduce((sum, otherDimension) => {
      if (dimension.dimensionId === otherDimension.dimensionId) return sum
      return (
        sum +
        getInteractionGain(
          dimension.dimensionId,
          otherDimension.dimensionId,
          settings.interactionAmount,
        )
      )
    }, 0)
    // With 3+ co-selected dimensions the sum may exceed 1, but the clamp
    // prevents interaction effects from amplifying beyond full strength.
    effectiveWeights.set(dimension.dimensionId, clamp01(dimension.weight * (1 + sumGain)))
  }
  return effectiveWeights
}

export async function loadSelectedProfiles(
  presets: SelectedPreset[],
  sources: ComposeSources,
  report: ComposeReport,
): Promise<LoadedProfile[]> {
  const loadResults = await Promise.all(
    presets.map(async (preset) => ({
      preset,
      profile: await sources.loadPresetProfile(preset.profileId),
    })),
  )
  const loadedProfiles: LoadedProfile[] = []
  for (const { preset, profile } of loadResults) {
    if (!profile) {
      report.missingPresets.push(preset.profileId)
      continue
    }
    loadedProfiles.push({ preset, profile })
  }
  return loadedProfiles
}

export function appendDimensionEvidence(
  dimensions: SelectedDimension[],
  sources: ComposeSources,
  report: ComposeReport,
): void {
  const dimensionIndex = new Map(
    sources.getExperienceDimensions().map((dimension) => [dimension.id, dimension]),
  )
  for (const dimension of dimensions) {
    const entry = sources.getDimensionMappingEntry(dimension.dimensionId)
    const definition = dimensionIndex.get(dimension.dimensionId)
    const rationaleDoc = entry?.rationale_doc ?? definition?.rationale_doc
    const evidenceStrength = entry?.evidence_strength ?? definition?.evidence_strength
    report.evidence.dimensions.push({
      dimensionId: dimension.dimensionId,
      rationaleDoc,
      evidenceStrength,
    })
    if (!entry) {
      report.evidence.gaps.push({
        dimensionId: dimension.dimensionId,
        reason: 'No dimension-to-signal mapping entry found',
      })
    } else if (!rationaleDoc) {
      report.evidence.gaps.push({
        dimensionId: dimension.dimensionId,
        reason: 'No rationale_doc found for dimension',
      })
    }
    if (String(evidenceStrength ?? '').toLowerCase() === 'hypothesis') {
      report.warnings.push(
        `Dimension ${dimension.dimensionId} is marked as hypothesis (evidence gap); keep conservative defaults.`,
      )
    }
  }
}

export function composeVideoStack(
  loadedProfiles: LoadedProfile[],
  dimensions: SelectedDimension[],
  effectiveWeights: Map<string, number>,
  sources: ComposeSources,
  report: ComposeReport,
  supportedVideoNodeIds: ReadonlySet<string>,
): VideoStackNodeDef[] {
  return finalizeVideoStack(
    collectVideoContributions(loadedProfiles, {
      dimensions,
      effectiveWeights,
      sources,
      report,
      supportedNodeIds: supportedVideoNodeIds,
    }),
  )
}

export function composeAudioStack(
  loadedProfiles: LoadedProfile[],
  dimensions: SelectedDimension[],
  effectiveWeights: Map<string, number>,
  settings: ComposerSettings,
  sources: ComposeSources,
  report: ComposeReport,
  supportedAudioNodeIds: ReadonlySet<string>,
): AudioStackConfig {
  return finalizeAudioStack(
    collectAudioContributions(loadedProfiles, {
      dimensions,
      effectiveWeights,
      sources,
      report,
      supportedNodeIds: supportedAudioNodeIds,
    }),
    settings,
  )
}

export function composeReactiveMappings(loadedProfiles: LoadedProfile[]): Profile['reactive'] {
  const reactiveAll = loadedProfiles.flatMap(
    ({ profile }) => profile.reactive?.analyser_to_params ?? [],
  )
  const reactiveKey = (mapping: (typeof reactiveAll)[number]) =>
    `${mapping.source}|${mapping.target}|${mapping.scale ?? ''}|${mapping.offset ?? ''}|${JSON.stringify(mapping.clamp ?? [])}|${JSON.stringify(mapping.smoothing ?? {})}`
  const reactiveDedup = new Map<string, (typeof reactiveAll)[number]>()
  for (const mapping of reactiveAll) reactiveDedup.set(reactiveKey(mapping), mapping)
  return {
    analyser_to_params: Array.from(reactiveDedup.values()).sort((a, b) =>
      a.target.localeCompare(b.target),
    ),
  }
}

export function finalizeMissingNodes(
  profile: Profile,
  report: ComposeReport,
  capabilities: CompositionCapabilities,
): void {
  for (const definition of profile.video_stack) {
    const node = normalizeNodeType(definition.node)
    if (!capabilities.supportedVideoNodeIds.has(node)) report.missingNodes.video.push(node)
  }
  for (const definition of profile.audio_stack?.chain ?? []) {
    const node = normalizeNodeType(definition.node)
    if (!capabilities.supportedAudioNodeIds.has(node)) report.missingNodes.audio.push(node)
  }
}
