/**
 * Resolve profile ui.controls target to pipeline param key and default value.
 * target "intensity" -> global intensity; "video.<nodeId>.<param>" -> nodeIndex.param.
 */

import type { Profile, UIControl } from './schema'
import { parseScopedTarget } from '../utils/targetPath'
import { getBuiltNodeIndex, type BuildVideoNodesOptions } from './graphBuilder'
import { addBuiltNodeDefaults } from './controlDefaultBuilder'

export interface ResolvedControl {
  control: UIControl
  /** Key for pipeline: "intensity", "safeMode", or "nodeIndex.param" */
  paramKey: string
  /** "intensity" | "safeMode" | "reducedMotion" | "audioEnabled" | "node" */
  kind: 'intensity' | 'safeMode' | 'reducedMotion' | 'audioEnabled' | 'node'
  nodeIndex?: number
  defaultValue: number | boolean
}

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
  const globalControls: Record<
    string,
    Pick<ResolvedControl, 'paramKey' | 'kind' | 'defaultValue'>
  > = {
    safe_mode: { paramKey: 'safeMode', kind: 'safeMode', defaultValue: false },
    safemode: { paramKey: 'safeMode', kind: 'safeMode', defaultValue: false },
    reduced_motion: { paramKey: 'reducedMotion', kind: 'reducedMotion', defaultValue: false },
    audio_enabled: { paramKey: 'audioEnabled', kind: 'audioEnabled', defaultValue: false },
  }
  const special = globalControls[target]
  if (special) return { control, ...special }
  if (control.id === 'safe_mode' || control.id === 'safeMode') {
    return { control, ...globalControls.safe_mode }
  }
  if (control.id === 'reduced_motion') return { control, ...globalControls.reduced_motion }
  if (control.id === 'audio_enabled') return { control, ...globalControls.audio_enabled }
  return null
}

function resolveVideoControl(
  control: UIControl,
  profile: Profile,
  target: string,
  options?: BuildVideoNodesOptions,
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

/**
 * Resolve a control's target to a param key and default value using the profile.
 */
export function resolveControl(
  control: UIControl,
  profile: Profile,
  options?: BuildVideoNodesOptions,
): ResolvedControl | null {
  const target = (control.target ?? control.id ?? '').toLowerCase()
  const global = resolveGlobalControl(control, profile, target)
  if (global) return global
  const video = resolveVideoControl(control, profile, target, options)
  if (video) return video
  return resolveAudioControl(control, profile, target)
}

/**
 * Build initial control values from profile (intensity, safeMode, node params).
 */
export function getDefaultControlValues(
  profile: Profile,
  options?: BuildVideoNodesOptions,
): Record<string, number | boolean> {
  const out = defaultGlobalControls(profile)
  addBuiltNodeDefaults({ out, profile, options })
  applyControlDefaults(out, profile, options)
  return out
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

function applyControlDefaults(
  out: Record<string, number | boolean>,
  profile: Profile,
  options?: BuildVideoNodesOptions,
): void {
  const controls = profile.ui?.controls ?? []
  for (const c of controls) {
    const resolved = resolveControl(c, profile, options)
    if (!resolved) continue
    out[resolved.paramKey] = resolved.defaultValue
  }
}
