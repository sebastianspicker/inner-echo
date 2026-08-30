import type { ComposerSettings, SelectedDimension, SelectedPreset } from './types'
import type { Profile } from '../schema'
import type {
  ComposeReport,
  ComposeResult,
  ComposeSources,
  CompositionCapabilities,
} from './contracts'
import { normalizeNodeType } from './composeBlend'
import { clampAudioParams, clampVideoParams, deriveComposedSafety } from './composeSafety'
import {
  appendDimensionEvidence,
  cleanSelectedDimensions,
  cleanSelectedPresets,
  composeAudioStack,
  composeReactiveMappings,
  composeVideoStack,
  deriveEffectiveDimensionWeights,
  finalizeMissingNodes,
  loadSelectedProfiles,
} from './composePhases'

export type { ComposeReport, ComposeResult, ComposeSources, MissingNodesReport } from './contracts'

function stableUniqSorted(list: string[]): string[] {
  return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b))
}

export async function composeEffectiveProfileCore(
  presets: SelectedPreset[],
  dimensions: SelectedDimension[],
  settings: ComposerSettings,
  sources: ComposeSources,
  capabilities: CompositionCapabilities,
): Promise<ComposeResult> {
  const report: ComposeReport = {
    missingNodes: { video: [], audio: [] },
    missingPresets: [],
    evidence: { dimensions: [], gaps: [] },
    warnings: [],
  }

  const cleanedPresets = cleanSelectedPresets(presets)
  const cleanedDims = cleanSelectedDimensions(dimensions)
  const effectiveDimWeight = deriveEffectiveDimensionWeights(cleanedDims, settings)
  const loadedProfiles = await loadSelectedProfiles(cleanedPresets, sources, report)
  appendDimensionEvidence(cleanedDims, sources, report)

  const safetyBlocks = loadedProfiles.map((p) => p.profile.safety)
  const derived = deriveComposedSafety(safetyBlocks, cleanedDims, (dimId) =>
    sources.getDimensionMappingEntry(dimId),
  )
  const { mergedDisableNodes } = derived

  let videoStack = composeVideoStack(
    loadedProfiles,
    cleanedDims,
    effectiveDimWeight,
    sources,
    report,
    capabilities.supportedVideoNodeIds,
  )
  const audioStack = composeAudioStack(
    loadedProfiles,
    cleanedDims,
    effectiveDimWeight,
    settings,
    sources,
    report,
    capabilities.supportedAudioNodeIds,
  )
  const reactive = composeReactiveMappings(loadedProfiles)

  if (settings.reducedMotion) {
    const disabled = new Set(mergedDisableNodes.map((s) => s.toLowerCase()))
    videoStack = videoStack.filter((d) => !disabled.has(normalizeNodeType(d.node)))
  }

  const safeClampsActive = derived.mergedSafeModeClamps
  const clampedVideoStack = clampVideoParams(videoStack, settings, safeClampsActive)
  const clampedAudioStack = clampAudioParams(audioStack, settings, safeClampsActive)

  report.missingPresets = stableUniqSorted(report.missingPresets)

  const profile: Profile = {
    id: 'composed',
    label: 'Composed Overlay',
    summary: 'A composed metaphorical overlay built from selected presets and/or dimensions.',
    framing: {
      type: 'metaphor',
      disclaimer:
        'This is a metaphorical interaction field for reflection. It does not diagnose or replicate clinical reality.',
    },
    experience_dimensions: cleanedDims.map((d) => ({ id: d.dimensionId, weight: d.weight })),
    safety: derived.composedSafety,
    video_stack: clampedVideoStack,
    audio_stack: clampedAudioStack,
    reactive,
    ui: { controls: [] },
    references: {
      dimensions: cleanedDims.map((d) => `docs/references/dimensions/${d.dimensionId}.md`),
    },
  } satisfies Profile

  finalizeMissingNodes(profile, report, capabilities)
  report.missingNodes.video = stableUniqSorted(report.missingNodes.video)
  report.missingNodes.audio = stableUniqSorted(report.missingNodes.audio)

  return { profile, report }
}
