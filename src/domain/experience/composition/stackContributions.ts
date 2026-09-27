import type { Profile } from '../schema'
import {
  makeIdForNode,
  motifsToAudioDefs,
  motifsToVideoDefs,
  normalizeNodeType,
  type SourceId,
} from './composeBlend'
import { clamp01, type SelectedDimension } from './types'
import type { ComposeReport, ComposeSources } from './contracts'

export type LoadedProfile = { preset: { profileId: string; weight: number }; profile: Profile }

export type StackContribution = {
  w: number
  params: Record<string, unknown>
  source: SourceId
  index: number
}

export type CollectedStackEntry = {
  node: string
  id: string
  contribs: StackContribution[]
  minIndex: number
}

type ContributionOptions = {
  dimensions: SelectedDimension[]
  effectiveWeights: Map<string, number>
  sources: ComposeSources
  report: ComposeReport
  supportedNodeIds: ReadonlySet<string>
}

function addContribution(
  entries: Map<string, CollectedStackEntry>,
  key: string,
  node: string,
  id: string,
  contribution: StackContribution,
): void {
  const entry = entries.get(key) ?? {
    node,
    id,
    contribs: [],
    minIndex: contribution.index,
  }
  entry.node = node
  entry.minIndex = Math.min(entry.minIndex, contribution.index)
  entry.contribs.push(contribution)
  entries.set(key, entry)
}

export function collectVideoContributions(
  loadedProfiles: LoadedProfile[],
  options: ContributionOptions,
): Map<string, CollectedStackEntry> {
  const entries = new Map<string, CollectedStackEntry>()
  collectPresetVideoContributions(entries, loadedProfiles)
  collectDimensionVideoContributions(entries, options)
  return entries
}

function collectPresetVideoContributions(
  entries: Map<string, CollectedStackEntry>,
  loadedProfiles: LoadedProfile[],
): void {
  for (const { preset, profile } of loadedProfiles) {
    for (const [index, definition] of profile.video_stack.entries()) {
      const node = normalizeNodeType(definition.node)
      const id = makeIdForNode(definition)
      const key = id || node
      addContribution(entries, key, node, key, {
        w: preset.weight,
        params: definition.params ?? {},
        source: `preset:${preset.profileId}`,
        index,
      })
    }
  }
}

function collectDimensionVideoContributions(
  entries: Map<string, CollectedStackEntry>,
  options: ContributionOptions,
): void {
  for (const dimension of options.dimensions) {
    const strength = clamp01(
      options.effectiveWeights.get(dimension.dimensionId) ?? dimension.weight,
    )
    const definitions = motifsToVideoDefs(
      options.sources.getDimensionMappingEntry(dimension.dimensionId)?.video_motifs ?? [],
      strength,
    )
    for (const [index, definition] of definitions.entries()) {
      const node = normalizeNodeType(definition.node)
      if (!options.supportedNodeIds.has(node)) {
        options.report.missingNodes.video.push(node)
        continue
      }
      const key = makeIdForNode(definition) || node
      addContribution(entries, key, node, key, {
        w: strength,
        params: definition.params ?? {},
        source: `dim:${dimension.dimensionId}`,
        index: 1000 + index,
      })
    }
  }
}

export type CollectedAudioContributions = {
  entries: Map<string, CollectedStackEntry>
  masterVolumes: Array<{ w: number; v: number }>
  anyAudioDeclared: boolean
}

export function collectAudioContributions(
  loadedProfiles: LoadedProfile[],
  options: ContributionOptions,
): CollectedAudioContributions {
  const entries = new Map<string, CollectedStackEntry>()
  const masterVolumes: Array<{ w: number; v: number }> = []
  const presetAudioDeclared = collectPresetAudioContributions(
    entries,
    masterVolumes,
    loadedProfiles,
  )
  const dimensionAudioDeclared = collectDimensionAudioContributions(entries, options)
  return {
    entries,
    masterVolumes,
    anyAudioDeclared: presetAudioDeclared || dimensionAudioDeclared,
  }
}

function collectPresetAudioContributions(
  entries: Map<string, CollectedStackEntry>,
  masterVolumes: Array<{ w: number; v: number }>,
  loadedProfiles: LoadedProfile[],
): boolean {
  let anyAudioDeclared = false
  for (const { preset, profile } of loadedProfiles) {
    const audio = profile.audio_stack
    if (audio?.enabled) anyAudioDeclared = true
    const volume = audio?.master?.volume
    if (typeof volume === 'number') masterVolumes.push({ w: preset.weight, v: volume })
    for (const [index, definition] of (audio?.chain ?? []).entries()) {
      const node = normalizeNodeType(definition.node)
      const id = (definition.id ?? definition.node ?? '').toString()
      const key = id || node
      addContribution(entries, key, node, key, {
        w: preset.weight,
        params: definition.params ?? {},
        source: `preset:${preset.profileId}`,
        index,
      })
    }
  }
  return anyAudioDeclared
}

function collectDimensionAudioContributions(
  entries: Map<string, CollectedStackEntry>,
  options: ContributionOptions,
): boolean {
  let anyAudioDeclared = false
  for (const dimension of options.dimensions) {
    const strength = clamp01(
      options.effectiveWeights.get(dimension.dimensionId) ?? dimension.weight,
    )
    const definitions = motifsToAudioDefs(
      options.sources.getDimensionMappingEntry(dimension.dimensionId)?.audio_motifs ?? [],
      strength,
    )
    if (definitions.length) anyAudioDeclared = true
    for (const [index, definition] of definitions.entries()) {
      const node = normalizeNodeType(definition.node)
      if (!options.supportedNodeIds.has(node)) {
        options.report.missingNodes.audio.push(node)
        continue
      }
      addContribution(entries, node, node, node, {
        w: strength,
        params: definition.params,
        source: `dim:${dimension.dimensionId}`,
        index: 1000 + index,
      })
    }
  }
  return anyAudioDeclared
}
