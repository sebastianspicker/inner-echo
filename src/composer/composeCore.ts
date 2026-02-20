import type { Profile, VideoStackNodeDef, AudioStackConfig, AnalyserToParamDef } from '../conditions/schema'
import type { ComposerSettings, SelectedDimension, SelectedPreset } from './types'
import { clamp01 } from './types'
import { getInteractionGain } from './interactionMatrix'
import {
  mergeParams,
  mergeNumericWeighted,
  sortStackKeys,
  VIDEO_ORDER_GROUP,
  AUDIO_ORDER_GROUP,
  normalizeNodeType,
  makeIdForNode,
  motifsToVideoDefs,
  motifsToAudioDefs,
  type SourceId,
} from './composeBlend'
import { clampAudioParams, clampVideoParams, deriveComposedSafety } from './composeSafety'

export type MissingNodesReport = {
  video: string[]
  audio: string[]
}

export type EvidenceReport = {
  /** Dimension id -> rationale doc path. */
  dimensions: Array<{ dimensionId: string; rationaleDoc?: string; evidenceStrength?: string }>
  /** Evidence gaps (missing mapping entry or missing rationale doc). */
  gaps: Array<{ dimensionId: string; reason: string }>
}

export type ComposeReport = {
  missingNodes: MissingNodesReport
  missingPresets: string[]
  evidence: EvidenceReport
  warnings: string[]
}

export type ComposeResult = {
  /** Profile-shaped output so existing engine code can consume it unchanged. */
  profile: Profile
  report: ComposeReport
}

export type MotifDef = {
  node: string
  params_hint?: Record<string, unknown>
}

export type DimensionSignalMappingEntry = {
  evidence_strength?: string
  rationale_doc?: string
  video_motifs?: MotifDef[]
  audio_motifs?: MotifDef[]
  safety?: {
    warnings?: string[]
    clamps?: Record<string, unknown>
    reduced_motion?: { disable_nodes?: string[] }
  }
}

export type ExperienceDimensionDef = {
  id: string
  label?: string
  evidence_strength?: string
  rationale_doc?: string
}

export type ComposeSources = {
  loadPresetProfile: (profileId: string) => Promise<Profile | null>
  getDimensionMappingEntry: (dimensionId: string) => DimensionSignalMappingEntry | null
  getExperienceDimensions: () => ExperienceDimensionDef[]
}

// Keep in sync with implemented engine nodes (graphBuilder + audioGraphBuilder).
const IMPLEMENTED_VIDEO_NODES = new Set<string>([
  'grain',
  'vignette',
  'chromatic_aberration',
  'chroma_aberration',
  'temporal_smear',
  'color_grade',
  'haze',
  'soft_blur',
  'edge_sharpen',
  'pulse',
  'interference',
  'focus_jitter',
  'feedback_loop',
  'grid_hint',
])

const IMPLEMENTED_AUDIO_NODES = new Set<string>([
  'lowpass',
  'highpass',
  'tremolo',
  'flutter',
  'noise_bed',
  'delay',
  'reverb',
  'pulse_tone',
  'compressor_limiter',
])

function stableUniqSorted(list: string[]): string[] {
  return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b))
}

export async function composeEffectiveProfileCore(
  presets: SelectedPreset[],
  dimensions: SelectedDimension[],
  settings: ComposerSettings,
  sources: ComposeSources
): Promise<ComposeResult> {
  const report: ComposeReport = {
    missingNodes: { video: [], audio: [] },
    missingPresets: [],
    evidence: { dimensions: [], gaps: [] },
    warnings: [],
  }

  const cleanedPresets = (presets ?? [])
    .map((p) => ({ profileId: String(p.profileId ?? '').trim(), weight: clamp01(p.weight) }))
    .filter((p) => p.profileId && p.weight > 0)
    .sort((a, b) => a.profileId.localeCompare(b.profileId))

  const cleanedDims = (dimensions ?? [])
    .map((d) => ({ dimensionId: String(d.dimensionId ?? '').trim(), weight: clamp01(d.weight) }))
    .filter((d) => d.dimensionId && d.weight > 0)
    .sort((a, b) => a.dimensionId.localeCompare(b.dimensionId))

  // Optional nonlinear interactions: conservative amplification of co-selected dimensions.
  // This is intentionally bounded and only affects how dimension motifs contribute to the composed stack.
  const effectiveDimWeight = new Map<string, number>()
  if (cleanedDims.length >= 2 && clamp01(settings.interactionAmount) > 0) {
    for (const a of cleanedDims) {
      let sumGain = 0
      for (const b of cleanedDims) {
        if (a.dimensionId === b.dimensionId) continue
        sumGain += getInteractionGain(a.dimensionId, b.dimensionId, settings.interactionAmount)
      }
      // Bounded: boost small weights a bit, but never exceed 1.
      effectiveDimWeight.set(a.dimensionId, clamp01(a.weight * (1 + sumGain)))
    }
  } else {
    for (const d of cleanedDims) effectiveDimWeight.set(d.dimensionId, d.weight)
  }

  const loadedProfiles: Array<{ preset: SelectedPreset; profile: Profile }> = []
  for (const p of cleanedPresets) {
    const prof = await sources.loadPresetProfile(p.profileId)
    if (!prof) {
      report.missingPresets.push(p.profileId)
      continue
    }
    loadedProfiles.push({ preset: p, profile: prof })
  }

  const dimIndex = new Map(sources.getExperienceDimensions().map((d) => [d.id, d]))
  for (const d of cleanedDims) {
    const entry = sources.getDimensionMappingEntry(d.dimensionId)
    const dimDef = dimIndex.get(d.dimensionId)
    const rationaleDoc = entry?.rationale_doc ?? dimDef?.rationale_doc
    const evidenceStrength = entry?.evidence_strength ?? dimDef?.evidence_strength
    report.evidence.dimensions.push({ dimensionId: d.dimensionId, rationaleDoc, evidenceStrength })
    if (!entry) {
      report.evidence.gaps.push({ dimensionId: d.dimensionId, reason: 'No dimension-to-signal mapping entry found' })
    } else if (!rationaleDoc) {
      report.evidence.gaps.push({ dimensionId: d.dimensionId, reason: 'No rationale_doc found for dimension' })
    }
    if (String(evidenceStrength ?? '').toLowerCase() === 'hypothesis') {
      report.warnings.push(`Dimension ${d.dimensionId} is marked as hypothesis (evidence gap); keep conservative defaults.`)
    }
  }

  const safetyBlocks = loadedProfiles.map((p) => p.profile.safety)
  const derived = deriveComposedSafety(
    safetyBlocks,
    cleanedDims,
    (dimId) => sources.getDimensionMappingEntry(dimId)
  )
  const { mergedDisableNodes } = derived

  type StackContrib = { w: number; params: Record<string, unknown>; source: SourceId; index: number; node: string; id: string }
  const videoByKey = new Map<string, { node: string; id: string; contribs: StackContrib[]; minIndex: number }>()

  for (const { preset, profile } of loadedProfiles) {
    for (let i = 0; i < (profile.video_stack ?? []).length; i++) {
      const def = profile.video_stack[i] as VideoStackNodeDef
      const node = normalizeNodeType(def.node)
      const id = makeIdForNode(def)
      const key = id || node
      const params = (def.params ?? {}) as Record<string, unknown>
      const entry = videoByKey.get(key) ?? { node, id: key, contribs: [], minIndex: i }
      entry.node = node
      entry.minIndex = Math.min(entry.minIndex, i)
      entry.contribs.push({ w: preset.weight, params, source: `preset:${preset.profileId}`, index: i, node, id: key })
      videoByKey.set(key, entry)
    }
  }

  for (const d of cleanedDims) {
    const entry = sources.getDimensionMappingEntry(d.dimensionId)
    const motifs = entry?.video_motifs ?? []
    const defs = motifsToVideoDefs(motifs)
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i]
      const node = normalizeNodeType(def.node)
      if (!IMPLEMENTED_VIDEO_NODES.has(node)) {
        report.missingNodes.video.push(node)
        continue
      }
      const key = makeIdForNode(def) || node
      const strength = clamp01(effectiveDimWeight.get(d.dimensionId) ?? d.weight)
      const scaledParams: Record<string, unknown> = {}
      for (const [k, v] of Object.entries((def.params ?? {}) as Record<string, unknown>)) {
        if (typeof v === 'number') scaledParams[k] = v * strength
        else scaledParams[k] = v
      }
      const e = videoByKey.get(key) ?? { node, id: key, contribs: [], minIndex: 1000 + i }
      e.minIndex = Math.min(e.minIndex, 1000 + i)
      e.contribs.push({ w: strength, params: scaledParams, source: `dim:${d.dimensionId}`, index: 1000 + i, node, id: key })
      videoByKey.set(key, e)
    }
  }

  const videoItems = Array.from(videoByKey.entries()).map(([key, v]) => ({
    key,
    node: v.node,
    id: v.id,
    minIndex: v.minIndex,
    minOrderGroup: VIDEO_ORDER_GROUP[v.node] ?? 1000,
    params: mergeParams(v.contribs.map((c) => ({ w: c.w, params: c.params, source: c.source }))),
  }))
  sortStackKeys(videoItems)

  let videoStack: VideoStackNodeDef[] = videoItems.map((it) => ({ id: it.id, node: it.node, params: it.params }))

  const audioByKey = new Map<
    string,
    { node: string; contribs: Array<{ w: number; params: Record<string, unknown>; source: SourceId; index: number }>; minIndex: number }
  >()
  const audioMasterVols: Array<{ w: number; v: number }> = []
  let anyAudioDeclared = false

  for (const { preset, profile } of loadedProfiles) {
    const a = profile.audio_stack
    if (a?.enabled) anyAudioDeclared = true
    const vol = a?.master?.volume
    if (typeof vol === 'number') audioMasterVols.push({ w: preset.weight, v: vol })
    const chain = a?.chain ?? []
    for (let i = 0; i < chain.length; i++) {
      const def = chain[i] as { id?: string; node: string; params?: Record<string, unknown> }
      const node = normalizeNodeType(def.node)
      const id = (def.id ?? def.node ?? '').toString()
      const key = id || node
      const params = (def.params ?? {}) as Record<string, unknown>
      const e = audioByKey.get(key) ?? { node, contribs: [], minIndex: i }
      e.node = node
      e.minIndex = Math.min(e.minIndex, i)
      e.contribs.push({ w: preset.weight, params, source: `preset:${preset.profileId}`, index: i })
      audioByKey.set(key, e)
    }
  }

  for (const d of cleanedDims) {
    const entry = sources.getDimensionMappingEntry(d.dimensionId)
    const motifs = entry?.audio_motifs ?? []
    const defs = motifsToAudioDefs(motifs)
    if (defs.length) anyAudioDeclared = true
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i]
      const node = normalizeNodeType(def.node)
      if (!IMPLEMENTED_AUDIO_NODES.has(node)) {
        report.missingNodes.audio.push(node)
        continue
      }
      const key = node
      const strength = clamp01(effectiveDimWeight.get(d.dimensionId) ?? d.weight)
      const scaledParams: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(def.params)) {
        if (typeof v === 'number') scaledParams[k] = v * strength
        else scaledParams[k] = v
      }
      const e = audioByKey.get(key) ?? { node, contribs: [], minIndex: 1000 + i }
      e.minIndex = Math.min(e.minIndex, 1000 + i)
      e.contribs.push({ w: strength, params: scaledParams, source: `dim:${d.dimensionId}`, index: 1000 + i })
      audioByKey.set(key, e)
    }
  }

  const audioItems = Array.from(audioByKey.entries()).map(([key, v]) => ({
    key,
    node: v.node,
    minIndex: v.minIndex,
    minOrderGroup: AUDIO_ORDER_GROUP[v.node] ?? 1000,
    params: mergeParams(v.contribs),
  }))
  sortStackKeys(audioItems)

  const chain = audioItems.map((it) => ({ id: it.node, node: it.node, params: it.params }))

  const enabled = settings.audioEnabled && anyAudioDeclared
  const baseMaster = enabled ? mergeNumericWeighted(audioMasterVols) : 0
  const audioStack: AudioStackConfig = {
    enabled,
    input: 'synth',
    master: { volume: Math.max(0, Math.min(1, baseMaster || 0.2)) },
    chain,
  }

  const reactiveAll: AnalyserToParamDef[] = []
  for (const { profile } of loadedProfiles) {
    const list = (profile as { reactive?: { analyser_to_params?: AnalyserToParamDef[] } }).reactive?.analyser_to_params ?? []
    for (const m of list) reactiveAll.push(m)
  }
  const reactiveKey = (m: AnalyserToParamDef) => `${m.source}|${m.target}|${m.scale ?? ''}|${m.offset ?? ''}|${JSON.stringify(m.clamp ?? [])}`
  const reactiveDedup = new Map<string, AnalyserToParamDef>()
  for (const m of reactiveAll) reactiveDedup.set(reactiveKey(m), m)
  const reactive = Array.from(reactiveDedup.values()).sort((a, b) => a.target.localeCompare(b.target))

  if (settings.reducedMotion) {
    const disabled = new Set(mergedDisableNodes.map((s) => s.toLowerCase()))
    videoStack = videoStack.filter((d) => !disabled.has(normalizeNodeType(d.node)))
  }

  const safeClampsActive = derived.mergedSafeModeClamps
  const clampedVideoStack = clampVideoParams(videoStack, settings, safeClampsActive)
  const clampedAudioStack = clampAudioParams(audioStack, settings, safeClampsActive)

  report.missingNodes.video = stableUniqSorted(report.missingNodes.video)
  report.missingNodes.audio = stableUniqSorted(report.missingNodes.audio)
  report.missingPresets = stableUniqSorted(report.missingPresets)

  const profile: Profile = {
    id: 'composed',
    label: 'Composed Overlay',
    summary: 'A composed metaphorical overlay built from selected presets and/or dimensions.',
    framing: {
      type: 'metaphor',
      disclaimer: 'This is a metaphorical interaction field for reflection. It does not diagnose or replicate clinical reality.',
    },
    experience_dimensions: cleanedDims.map((d) => ({ id: d.dimensionId, weight: d.weight })),
    safety: derived.composedSafety,
    video_stack: clampedVideoStack,
    audio_stack: clampedAudioStack,
    reactive: { analyser_to_params: reactive },
    ui: { controls: [] },
    references: { dimensions: cleanedDims.map((d) => `docs/references/dimensions/${d.dimensionId}.md`) },
  } as Profile

  for (const v of profile.video_stack) {
    const node = normalizeNodeType(v.node)
    if (!IMPLEMENTED_VIDEO_NODES.has(node)) report.missingNodes.video.push(node)
  }
  for (const a of profile.audio_stack?.chain ?? []) {
    const node = normalizeNodeType(a.node)
    if (!IMPLEMENTED_AUDIO_NODES.has(node)) report.missingNodes.audio.push(node)
  }
  report.missingNodes.video = stableUniqSorted(report.missingNodes.video)
  report.missingNodes.audio = stableUniqSorted(report.missingNodes.audio)

  return { profile, report }
}
