/**
 * Private composition phases extracted from composeCore to keep its public
 * orchestration boundary small while retaining deterministic composition rules.
 */

import type { AudioStackConfig, Profile, VideoStackNodeDef } from '../conditions/schema'
import { IMPLEMENTED_AUDIO_NODES, IMPLEMENTED_VIDEO_NODES } from '../engine/nodeTypes'
import {
  AUDIO_ORDER_GROUP,
  deduplicateStackIds,
  makeIdForNode,
  mergeNumericWeighted,
  mergeParams,
  motifsToAudioDefs,
  motifsToVideoDefs,
  normalizeNodeType,
  sortStackKeys,
  type SourceId,
  VIDEO_ORDER_GROUP,
} from './composeBlend'
import { getInteractionGain } from './interactionMatrix'
import {
  clamp01,
  type ComposerSettings,
  type SelectedDimension,
  type SelectedPreset,
} from './types'
import type { ComposeReport, ComposeSources } from './composeCore'

type LoadedProfile = { preset: SelectedPreset; profile: Profile }

type StackContrib = {
  w: number
  params: Record<string, unknown>
  source: SourceId
  index: number
  node: string
  id: string
}

export function cleanSelectedPresets(presets: SelectedPreset[]): SelectedPreset[] {
  return (Array.isArray(presets) ? presets : [])
    .filter((preset) => preset && typeof preset === 'object' && 'profileId' in preset)
    .map((preset) => ({
      profileId: String(preset.profileId ?? '').trim(),
      weight: clamp01(typeof preset.weight === 'number' ? preset.weight : 0),
    }))
    .filter((preset) => preset.profileId && preset.profileId !== 'undefined' && preset.weight > 0)
    .sort((a, b) => a.profileId.localeCompare(b.profileId))
}

export function cleanSelectedDimensions(dimensions: SelectedDimension[]): SelectedDimension[] {
  return (Array.isArray(dimensions) ? dimensions : [])
    .filter((dimension) => dimension && typeof dimension === 'object' && 'dimensionId' in dimension)
    .map((dimension) => ({
      dimensionId: String(dimension.dimensionId ?? '').trim(),
      weight: clamp01(typeof dimension.weight === 'number' ? dimension.weight : 0),
    }))
    .filter(
      (dimension) =>
        dimension.dimensionId && dimension.dimensionId !== 'undefined' && dimension.weight > 0,
    )
    .sort((a, b) => a.dimensionId.localeCompare(b.dimensionId))
}

export function deriveEffectiveDimensionWeights(
  dimensions: SelectedDimension[],
  settings: ComposerSettings,
): Map<string, number> {
  const effectiveWeights = new Map<string, number>()
  if (dimensions.length >= 2 && clamp01(settings.interactionAmount) > 0) {
    for (const dimension of dimensions) {
      let sumGain = 0
      for (const otherDimension of dimensions) {
        if (dimension.dimensionId === otherDimension.dimensionId) continue
        sumGain += getInteractionGain(
          dimension.dimensionId,
          otherDimension.dimensionId,
          settings.interactionAmount,
        )
      }
      // Bounded: boost small weights a bit, but never exceed 1.
      // Intentional: with 3+ co-selected dimensions sumGain may exceed 1,
      // but clamp01 caps the effective weight so interaction effects never
      // amplify beyond full strength: preventing runaway amplification.
      effectiveWeights.set(dimension.dimensionId, clamp01(dimension.weight * (1 + sumGain)))
    }
  } else {
    for (const dimension of dimensions) {
      effectiveWeights.set(dimension.dimensionId, dimension.weight)
    }
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
): VideoStackNodeDef[] {
  const videoByKey = new Map<
    string,
    { node: string; id: string; contribs: StackContrib[]; minIndex: number }
  >()

  for (const { preset, profile } of loadedProfiles) {
    for (let index = 0; index < (profile.video_stack ?? []).length; index++) {
      const definition = profile.video_stack[index]
      const node = normalizeNodeType(definition.node)
      const id = makeIdForNode(definition)
      const key = id || node
      const params = definition.params ?? {}
      const entry = videoByKey.get(key) ?? { node, id: key, contribs: [], minIndex: index }
      entry.node = node
      entry.minIndex = Math.min(entry.minIndex, index)
      entry.contribs.push({
        w: preset.weight,
        params,
        source: `preset:${preset.profileId}`,
        index,
        node,
        id: key,
      })
      videoByKey.set(key, entry)
    }
  }

  for (const dimension of dimensions) {
    const entry = sources.getDimensionMappingEntry(dimension.dimensionId)
    const strength = clamp01(effectiveWeights.get(dimension.dimensionId) ?? dimension.weight)
    const definitions = motifsToVideoDefs(entry?.video_motifs ?? [], strength)
    for (let index = 0; index < definitions.length; index++) {
      const definition = definitions[index]
      const node = normalizeNodeType(definition.node)
      if (!IMPLEMENTED_VIDEO_NODES.has(node)) {
        report.missingNodes.video.push(node)
        continue
      }
      const key = makeIdForNode(definition) || node
      const videoEntry = videoByKey.get(key) ?? {
        node,
        id: key,
        contribs: [],
        minIndex: 1000 + index,
      }
      videoEntry.minIndex = Math.min(videoEntry.minIndex, 1000 + index)
      videoEntry.contribs.push({
        w: strength,
        params: definition.params ?? {},
        source: `dim:${dimension.dimensionId}`,
        index: 1000 + index,
        node,
        id: key,
      })
      videoByKey.set(key, videoEntry)
    }
  }

  const videoItems = Array.from(videoByKey.entries()).map(([key, value]) => ({
    key,
    node: value.node,
    id: value.id,
    minIndex: value.minIndex,
    minOrderGroup: VIDEO_ORDER_GROUP[value.node] ?? 1000,
    params: mergeParams(
      value.contribs.map((contribution) => ({
        w: contribution.w,
        params: contribution.params,
        source: contribution.source,
      })),
    ),
  }))
  sortStackKeys(videoItems)
  return deduplicateStackIds(
    videoItems.map((item) => ({ id: item.id, node: item.node, params: item.params })),
  )
}

export function composeAudioStack(
  loadedProfiles: LoadedProfile[],
  dimensions: SelectedDimension[],
  effectiveWeights: Map<string, number>,
  settings: ComposerSettings,
  sources: ComposeSources,
  report: ComposeReport,
): AudioStackConfig {
  const audioByKey = new Map<
    string,
    {
      node: string
      contribs: Array<{
        w: number
        params: Record<string, unknown>
        source: SourceId
        index: number
      }>
      minIndex: number
    }
  >()
  const audioMasterVols: Array<{ w: number; v: number }> = []
  let anyAudioDeclared = false

  for (const { preset, profile } of loadedProfiles) {
    const audio = profile.audio_stack
    if (audio?.enabled) anyAudioDeclared = true
    const volume = audio?.master?.volume
    if (typeof volume === 'number') audioMasterVols.push({ w: preset.weight, v: volume })
    const chain = audio?.chain ?? []
    for (let index = 0; index < chain.length; index++) {
      const definition = chain[index] as {
        id?: string
        node: string
        params?: Record<string, unknown>
      }
      const node = normalizeNodeType(definition.node)
      const id = (definition.id ?? definition.node ?? '').toString()
      const key = id || node
      const params = definition.params ?? {}
      const entry = audioByKey.get(key) ?? { node, contribs: [], minIndex: index }
      entry.node = node
      entry.minIndex = Math.min(entry.minIndex, index)
      entry.contribs.push({
        w: preset.weight,
        params,
        source: `preset:${preset.profileId}`,
        index,
      })
      audioByKey.set(key, entry)
    }
  }

  for (const dimension of dimensions) {
    const entry = sources.getDimensionMappingEntry(dimension.dimensionId)
    const strength = clamp01(effectiveWeights.get(dimension.dimensionId) ?? dimension.weight)
    const definitions = motifsToAudioDefs(entry?.audio_motifs ?? [], strength)
    if (definitions.length) anyAudioDeclared = true
    for (let index = 0; index < definitions.length; index++) {
      const definition = definitions[index]
      const node = normalizeNodeType(definition.node)
      if (!IMPLEMENTED_AUDIO_NODES.has(node)) {
        report.missingNodes.audio.push(node)
        continue
      }
      const audioEntry = audioByKey.get(node) ?? { node, contribs: [], minIndex: 1000 + index }
      audioEntry.minIndex = Math.min(audioEntry.minIndex, 1000 + index)
      audioEntry.contribs.push({
        w: strength,
        params: definition.params,
        source: `dim:${dimension.dimensionId}`,
        index: 1000 + index,
      })
      audioByKey.set(node, audioEntry)
    }
  }

  const audioItems = Array.from(audioByKey.entries()).map(([key, value]) => ({
    key,
    node: value.node,
    minIndex: value.minIndex,
    minOrderGroup: AUDIO_ORDER_GROUP[value.node] ?? 1000,
    params: mergeParams(value.contribs),
  }))
  sortStackKeys(audioItems)

  const chain = deduplicateStackIds(
    audioItems.map((item) => ({ id: item.node, node: item.node, params: item.params })),
  )
  const enabled = settings.audioEnabled && anyAudioDeclared
  const baseMaster = enabled ? mergeNumericWeighted(audioMasterVols) : 0
  return {
    enabled,
    input: 'synth',
    master: { volume: clamp01(baseMaster || 0.2) },
    chain,
  }
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

export function finalizeMissingNodes(profile: Profile, report: ComposeReport): void {
  for (const definition of profile.video_stack) {
    const node = normalizeNodeType(definition.node)
    if (!IMPLEMENTED_VIDEO_NODES.has(node)) report.missingNodes.video.push(node)
  }
  for (const definition of profile.audio_stack?.chain ?? []) {
    const node = normalizeNodeType(definition.node)
    if (!IMPLEMENTED_AUDIO_NODES.has(node)) report.missingNodes.audio.push(node)
  }
}
