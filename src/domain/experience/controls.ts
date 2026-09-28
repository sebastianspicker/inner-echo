/**
 * Parameter addressing: resolves a profile's `ui.controls` entries to pipeline param
 * keys ("intensity", "safeMode", "reducedMotion", "audioEnabled", "<builtIndex>.<param>",
 * "audio.<chainIndex>.<param>") and derives default control values from profile data.
 *
 * `options.supportedNodeIds` is required here (no runtime-importing default): callers
 * own which node ids the active runtime supports.
 */
import type { Profile, UIControl } from './schema'
import { parseScopedTarget } from './parameterTarget'
import {
  getBuiltNodeIndex,
  getProfileEntryForBuiltIndex,
  type BuildVideoNodesOptions,
} from './videoStack'

export interface ResolvedControl {
  control: UIControl
  /** Key for pipeline: "intensity", "safeMode", or "nodeIndex.param" */
  paramKey: string
  /** "intensity" | "safeMode" | "reducedMotion" | "audioEnabled" | "node" */
  kind: 'intensity' | 'safeMode' | 'reducedMotion' | 'audioEnabled' | 'node'
  nodeIndex?: number
  defaultValue: number | boolean
}

type GlobalControl = Pick<ResolvedControl, 'paramKey' | 'kind' | 'defaultValue'>

const GLOBAL_CONTROLS: Record<string, GlobalControl> = {
  safe_mode: { paramKey: 'safeMode', kind: 'safeMode', defaultValue: false },
  safemode: { paramKey: 'safeMode', kind: 'safeMode', defaultValue: false },
  reduced_motion: { paramKey: 'reducedMotion', kind: 'reducedMotion', defaultValue: false },
  audio_enabled: { paramKey: 'audioEnabled', kind: 'audioEnabled', defaultValue: false },
}

const GLOBAL_CONTROL_KINDS = new Set(['intensity', 'safeMode', 'reducedMotion', 'audioEnabled'])

function numericOrControlDefault(
  params: Record<string, unknown> | undefined,
  param: string,
  control: UIControl,
): number | boolean {
  const value = params?.[param]
  return typeof value === 'number' ? value : control.type === 'toggle' ? false : (control.min ?? 0)
}

function resolveGlobalControl(
  control: UIControl,
  profile: Profile,
  target: string,
): ResolvedControl | null {
  if (target === 'intensity' || (control.id === 'intensity' && !control.target)) {
    const value = profile.safety?.intensity_default
    return {
      control,
      paramKey: 'intensity',
      kind: 'intensity',
      defaultValue: typeof value === 'number' ? value : 0.5,
    }
  }

  const special = GLOBAL_CONTROLS[target]
  if (special) return { control, ...special }
  if (control.id === 'safe_mode' || control.id === 'safeMode') {
    return { control, ...GLOBAL_CONTROLS.safe_mode }
  }
  if (control.id === 'reduced_motion') return { control, ...GLOBAL_CONTROLS.reduced_motion }
  if (control.id === 'audio_enabled') return { control, ...GLOBAL_CONTROLS.audio_enabled }
  return null
}

function resolveVideoControl(
  control: UIControl,
  profile: Profile,
  target: string,
  options: BuildVideoNodesOptions,
): ResolvedControl | null {
  const parsed = parseScopedTarget(target, 'video')
  if (!parsed) return null
  const { nodeId, param } = parsed
  const nodeIndex = getBuiltNodeIndex(profile, nodeId, options)
  if (nodeIndex === -1) return null
  const entry = profile.video_stack.find((node) => {
    const nodeName = (node.node ?? '').toLowerCase()
    return (node.id ?? node.node ?? '').toLowerCase() === nodeId || nodeName === nodeId
  })
  return {
    control,
    paramKey: `${nodeIndex}.${param}`,
    kind: 'node',
    nodeIndex,
    defaultValue: numericOrControlDefault(entry?.params, param, control),
  }
}

function resolveAudioControl(
  control: UIControl,
  profile: Profile,
  target: string,
): ResolvedControl | null {
  const parsed = parseScopedTarget(target, 'audio')
  if (!parsed) return null
  const { nodeId, param } = parsed
  const chain = profile.audio_stack?.chain ?? []
  const nodeIndex = chain.findIndex((node) => {
    const nodeName = (node.node ?? '').toLowerCase()
    return (
      ((node as { id?: string }).id ?? node.node ?? '').toLowerCase() === nodeId ||
      nodeName === nodeId
    )
  })
  if (nodeIndex === -1) return null
  return {
    control,
    paramKey: `audio.${nodeIndex}.${param}`,
    kind: 'node',
    nodeIndex,
    defaultValue: numericOrControlDefault(chain[nodeIndex]?.params, param, control),
  }
}

/** Resolve a control's target to a param key and default value using the profile. */
export function resolveControl(
  control: UIControl,
  profile: Profile,
  options: BuildVideoNodesOptions,
): ResolvedControl | null {
  const target = (control.target ?? control.id ?? '').toLowerCase()
  return (
    resolveGlobalControl(control, profile, target) ??
    resolveVideoControl(control, profile, target, options) ??
    resolveAudioControl(control, profile, target)
  )
}

/** Resolve node-scoped controls only (excludes global intensity/safeMode/etc). */
export function resolveProfileControls(
  profile: Profile,
  options: BuildVideoNodesOptions,
): ResolvedControl[] {
  const controls: ResolvedControl[] = []
  for (const control of profile.ui?.controls ?? []) {
    const resolved = resolveControl(control, profile, options)
    if (resolved && !GLOBAL_CONTROL_KINDS.has(resolved.kind)) controls.push(resolved)
  }
  return controls
}

function defaultGlobalControls(profile: Profile): Record<string, number | boolean> {
  const safety = profile.safety
  return {
    intensity: typeof safety?.intensity_default === 'number' ? safety.intensity_default : 0.5,
    safeMode: false,
    reducedMotion: false,
    audioEnabled: false,
  }
}

function addBuiltNodeDefaults(
  out: Record<string, number | boolean>,
  profile: Profile,
  options: BuildVideoNodesOptions,
): void {
  for (let builtIndex = 0; ; builtIndex++) {
    const entry = getProfileEntryForBuiltIndex(profile, builtIndex, options)
    if (!entry) return
    for (const [param, value] of Object.entries(entry.params ?? {})) {
      if (typeof value === 'number' || typeof value === 'boolean')
        out[`${builtIndex}.${param}`] = value
    }
  }
}

function applyControlDefaults(
  out: Record<string, number | boolean>,
  profile: Profile,
  options: BuildVideoNodesOptions,
): void {
  for (const control of profile.ui?.controls ?? []) {
    const resolved = resolveControl(control, profile, options)
    if (resolved) out[resolved.paramKey] = resolved.defaultValue
  }
}

/** Build initial control values from profile (intensity, safeMode, node params). */
export function getDefaultControlValues(
  profile: Profile,
  options: BuildVideoNodesOptions,
): Record<string, number | boolean> {
  const out = defaultGlobalControls(profile)
  addBuiltNodeDefaults(out, profile, options)
  applyControlDefaults(out, profile, options)
  return out
}

/** Merge previous control values into a fresh default set, keeping matching-type overrides. */
export function mergeControlValuesWithDefaults(
  defaults: Record<string, number | boolean>,
  previous: Record<string, number | boolean>,
): Record<string, number | boolean> {
  const next: Record<string, number | boolean> = { ...defaults }
  for (const [key, fallback] of Object.entries(defaults)) {
    const previousValue = previous[key]
    if (typeof previousValue === typeof fallback) next[key] = previousValue
  }
  return next
}

/** Recompute profile defaults, keeping the user's persisted global control overrides. */
export function mergePersistedControlValues(
  profile: Profile,
  options: BuildVideoNodesOptions,
  previous: Record<string, number | boolean>,
): Record<string, number | boolean> {
  const defaults = getDefaultControlValues(profile, options)
  for (const key of ['intensity', 'safeMode', 'audioEnabled'] as const) {
    if (typeof previous[key] === typeof defaults[key]) defaults[key] = previous[key]
  }
  return defaults
}
