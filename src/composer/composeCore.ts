import type { Profile, VideoStackNodeDef, AudioStackConfig, AnalyserToParamDef } from '../conditions/schema'
import type { ComposerSettings, SelectedDimension, SelectedPreset } from './types'
import { clamp01 } from './types'
import { getInteractionGain } from './interactionMatrix'

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

type SourceId = string

function stableUniqSorted(list: string[]): string[] {
  return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b))
}

function parseNumberHints(hint: unknown): number[] {
  if (typeof hint !== 'string') return []
  const nums = hint.match(/-?\d+(\.\d+)?/g) ?? []
  return nums.map((s) => Number(s)).filter((n) => Number.isFinite(n))
}

function pickFromHint(hint: unknown, strength01: number): unknown {
  // If hint provides a numeric range, choose within it based on strength (safe-by-default).
  const nums = parseNumberHints(hint)
  if (nums.length >= 2) {
    const a = nums[0]
    const b = nums[1]
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    return lo + (hi - lo) * clamp01(strength01)
  }
  if (nums.length === 1) return nums[0]

  // Heuristic for categorical hints (keep conservative defaults).
  if (typeof hint === 'string') {
    const s = hint.toLowerCase()
    if (s.includes('pink')) return 'pink'
    if (s.includes('brown')) return 'brown'
    if (s.includes('white')) return 'white'
  }
  return undefined
}

function mergeNumericWeighted(items: Array<{ w: number; v: number }>): number {
  let sumW = 0
  let sum = 0
  for (const it of items) {
    const w = clamp01(it.w)
    const v = it.v
    if (!Number.isFinite(v) || w <= 0) continue
    sumW += w
    sum += v * w
  }
  if (sumW <= 0) return 0
  return sum / sumW
}

function mergeParams(contribs: Array<{ w: number; params: Record<string, unknown>; source: SourceId }>): Record<string, unknown> {
  const keys = new Set<string>()
  for (const c of contribs) {
    for (const k of Object.keys(c.params ?? {})) keys.add(k)
  }
  const out: Record<string, unknown> = {}
  const orderedKeys = Array.from(keys).sort((a, b) => a.localeCompare(b))
  for (const k of orderedKeys) {
    const numerics: Array<{ w: number; v: number }> = []
    const nonNumerics: Array<{ w: number; v: unknown; source: SourceId }> = []
    for (const c of contribs) {
      const v = c.params?.[k]
      if (typeof v === 'number') numerics.push({ w: c.w, v })
      else if (v != null) nonNumerics.push({ w: c.w, v, source: c.source })
    }
    if (numerics.length) {
      out[k] = mergeNumericWeighted(numerics)
    } else if (nonNumerics.length) {
      nonNumerics.sort((a, b) => {
        const dw = clamp01(b.w) - clamp01(a.w)
        if (dw !== 0) return dw
        return a.source.localeCompare(b.source)
      })
      out[k] = nonNumerics[0].v
    }
  }
  return out
}

function sortStackKeys<T extends { key: string; node: string; minIndex: number; minOrderGroup: number }>(items: T[]): T[] {
  return items.sort((a, b) => {
    if (a.minOrderGroup !== b.minOrderGroup) return a.minOrderGroup - b.minOrderGroup
    if (a.minIndex !== b.minIndex) return a.minIndex - b.minIndex
    const dn = a.node.localeCompare(b.node)
    if (dn !== 0) return dn
    return a.key.localeCompare(b.key)
  })
}

const VIDEO_ORDER_GROUP: Record<string, number> = {
  grain: 10,
  edge_sharpen: 20,
  soft_blur: 22,
  vignette: 25,
  haze: 30,
  color_grade: 40,
  chroma_aberration: 50,
  chromatic_aberration: 50,
  temporal_smear: 60,
  feedback_loop: 70,
  pulse: 80,
  interference: 90,
  focus_jitter: 95,
  grid_hint: 100,
}

const AUDIO_ORDER_GROUP: Record<string, number> = {
  noise_bed: 10,
  highpass: 20,
  lowpass: 30,
  tremolo: 40,
  flutter: 45,
  delay: 60,
  reverb: 70,
  pulse_tone: 80,
  compressor_limiter: 90,
}

function normalizeNodeType(s: string): string {
  return String(s ?? '').trim().toLowerCase()
}

function makeIdForNode(def: { id?: string; node: string }): string {
  return (def.id ?? def.node ?? '').toString()
}

function mergeWarnings(lists: string[][]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const list of lists) {
    for (const w of list ?? []) {
      const s = String(w).trim()
      if (!s || seen.has(s)) continue
      seen.add(s)
      out.push(s)
    }
  }
  return out
}

function mergeDisableNodes(lists: Array<string[] | undefined>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const list of lists) {
    for (const n of list ?? []) {
      const s = String(n).trim().toLowerCase()
      if (!s || seen.has(s)) continue
      seen.add(s)
      out.push(s)
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
}

function mergeSafeModeClamps(items: Array<Record<string, unknown> | undefined>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const keys = new Set<string>()
  for (const it of items) {
    for (const k of Object.keys(it ?? {})) keys.add(k)
  }
  for (const k of Array.from(keys).sort((a, b) => a.localeCompare(b))) {
    const vs = items.map((it) => it?.[k]).filter((v) => v != null)
    if (!vs.length) continue
    if (vs.every((v) => typeof v === 'number')) {
      out[k] = Math.min(...(vs as number[]))
      continue
    }
    if (vs.every((v) => typeof v === 'boolean')) {
      out[k] = (vs as boolean[]).some(Boolean)
      continue
    }
    out[k] = vs[0]
  }
  return out
}

function clampAudioParams(config: AudioStackConfig, settings: ComposerSettings, safeModeClamps: Record<string, unknown>): AudioStackConfig {
  const maxNoise = typeof safeModeClamps.max_noise_level === 'number' ? safeModeClamps.max_noise_level : 0.08
  const maxTremoloRate = typeof safeModeClamps.max_tremolo_rate_hz === 'number' ? safeModeClamps.max_tremolo_rate_hz : 4
  const maxTremoloDepth = typeof safeModeClamps.max_tremolo_depth === 'number' ? safeModeClamps.max_tremolo_depth : 0.15
  const hardMaxFeedback = clamp01(settings.maxFeedback)

  const chain = (config.chain ?? []).map((n) => {
    const node = normalizeNodeType(n.node)
    const params = { ...(n.params ?? {}) }
    if (node === 'noise_bed' && typeof params.level === 'number') {
      params.level = Math.max(0, Math.min(maxNoise, params.level))
    }
    if (node === 'tremolo') {
      if (typeof params.rate === 'number') params.rate = Math.max(0, Math.min(maxTremoloRate, params.rate))
      if (typeof params.depth === 'number') params.depth = Math.max(0, Math.min(maxTremoloDepth, params.depth))
    }
    if (node === 'delay' && typeof params.feedback === 'number') {
      params.feedback = Math.max(0, Math.min(0.18 * hardMaxFeedback + 0.02, params.feedback))
    }
    return { ...n, node, params }
  })
  return { ...config, chain }
}

function clampVideoParams(stack: VideoStackNodeDef[], settings: ComposerSettings, safeModeClamps: Record<string, unknown>): VideoStackNodeDef[] {
  const maxFeedback = typeof safeModeClamps.max_feedback === 'number' ? safeModeClamps.max_feedback : 0.18
  const maxJitter = typeof safeModeClamps.max_jitter === 'number' ? safeModeClamps.max_jitter : 0.06
  const maxPulseDepth = typeof safeModeClamps.max_pulse_depth === 'number' ? safeModeClamps.max_pulse_depth : 0.18
  const maxChroma = typeof safeModeClamps.max_chroma === 'number' ? safeModeClamps.max_chroma : 0.12

  const hardMaxFeedback = clamp01(settings.maxFeedback)
  const hard = (x: number, max: number) => Math.max(0, Math.min(max * hardMaxFeedback + max * 0.05, x))

  return stack.map((def) => {
    const node = normalizeNodeType(def.node)
    const params: Record<string, unknown> = { ...(def.params ?? {}) }
    if (node === 'temporal_smear' && typeof params.feedback === 'number') {
      params.feedback = hard(params.feedback, maxFeedback)
    }
    if (node === 'feedback_loop' && typeof params.amount === 'number') {
      params.amount = hard(params.amount, maxFeedback)
    }
    if (node === 'focus_jitter' && typeof params.amount === 'number') {
      params.amount = hard(params.amount, maxJitter)
    }
    if (node === 'pulse' && typeof params.depth === 'number') {
      params.depth = hard(params.depth, maxPulseDepth)
    }
    if ((node === 'chroma_aberration' || node === 'chromatic_aberration') && typeof params.amount === 'number') {
      params.amount = hard(params.amount, maxChroma)
    }
    for (const k of Object.keys(params)) {
      const v = params[k]
      if (
        typeof v === 'number' &&
        k !== 'rate' &&
        k !== 'cutoff' &&
        k !== 'burst_duration_ms' &&
        k !== 'burst_min_gap_ms'
      ) {
        params[k] = Math.max(-1, Math.min(1, v))
      }
    }
    return { ...def, node, params }
  })
}

function motifsToVideoDefs(motifs: MotifDef[] | undefined): VideoStackNodeDef[] {
  if (!motifs?.length) return []
  const strength = 1
  return motifs.map((m) => {
    const node = normalizeNodeType(m.node)
    const hint = (m.params_hint ?? {}) as Record<string, unknown>
    const params: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(hint)) {
      const chosen = pickFromHint(v, strength)
      if (chosen != null) params[k] = chosen
    }
    return { id: node, node, params }
  })
}

function motifsToAudioDefs(motifs: MotifDef[] | undefined): Array<{ node: string; params: Record<string, unknown> }> {
  if (!motifs?.length) return []
  const strength = 1
  return motifs.map((m) => {
    const node = normalizeNodeType(m.node)
    const hint = (m.params_hint ?? {}) as Record<string, unknown>
    const params: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(hint)) {
      const chosen = pickFromHint(v, strength)
      if (chosen != null) params[k] = chosen
    }
    return { node, params }
  })
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
  const safeModeClampsList: Array<Record<string, unknown> | undefined> = safetyBlocks.map(
    (s) => s.safe_mode_clamps as Record<string, unknown>
  )
  const reducedMotionDisableLists: Array<string[] | undefined> = safetyBlocks.map((s) => s.reduced_motion_policy?.disable_nodes)
  const warningsLists: string[][] = safetyBlocks.map((s) => s.warnings ?? [])

  for (const d of cleanedDims) {
    const entry = sources.getDimensionMappingEntry(d.dimensionId)
    const dimSafety = entry?.safety
    if (dimSafety?.warnings?.length) warningsLists.push(dimSafety.warnings)
    if (dimSafety?.clamps) safeModeClampsList.push(dimSafety.clamps)
    if (dimSafety?.reduced_motion?.disable_nodes?.length) reducedMotionDisableLists.push(dimSafety.reduced_motion.disable_nodes)
  }

  const mergedSafeModeClamps = mergeSafeModeClamps(safeModeClampsList)
  const mergedWarnings = mergeWarnings(warningsLists)
  const mergedDisableNodes = mergeDisableNodes(reducedMotionDisableLists)

  const intensityMaxByPresets = safetyBlocks
    .map((s) => (typeof s.intensity_max === 'number' ? s.intensity_max : 1))
    .reduce((a, b) => Math.min(a, b), 1)
  const intensityDefaultByPresets = safetyBlocks
    .map((s) => (typeof s.intensity_default === 'number' ? s.intensity_default : 0.3))
    .reduce((a, b) => Math.min(a, b), 0.3)

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

  const composedSafety: Profile['safety'] = {
    intensity_default: intensityDefaultByPresets,
    intensity_max: intensityMaxByPresets,
    warnings: mergedWarnings,
    safe_mode_clamps: mergedSafeModeClamps,
    reduced_motion_policy: {
      disable_nodes: mergedDisableNodes,
      note: 'Composed policy: union of selected presets and dimensions (conservative).',
    },
  }

  if (settings.reducedMotion) {
    const disabled = new Set(mergedDisableNodes.map((s) => s.toLowerCase()))
    videoStack = videoStack.filter((d) => !disabled.has(normalizeNodeType(d.node)))
  }

  const safeClampsActive = composedSafety.safe_mode_clamps as Record<string, unknown>
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
    safety: composedSafety,
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

