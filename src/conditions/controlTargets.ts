/**
 * Resolve profile ui.controls target to pipeline param key and default value.
 * target "intensity" -> global intensity; "video.<nodeId>.<param>" -> nodeIndex.param.
 */

import type { Profile, UIControl } from './schema'
import { parseScopedTarget } from '../utils/targetPath'
import {
  getBuiltNodeIndex,
  getProfileEntryForBuiltIndex,
  type BuildVideoNodesOptions,
} from './graphBuilder'

export interface ResolvedControl {
  control: UIControl
  /** Key for pipeline: "intensity", "safeMode", or "nodeIndex.param" */
  paramKey: string
  /** "intensity" | "safeMode" | "reducedMotion" | "audioEnabled" | "node" */
  kind: 'intensity' | 'safeMode' | 'reducedMotion' | 'audioEnabled' | 'node'
  nodeIndex?: number
  defaultValue: number | boolean
}

function basicControl(
  control: UIControl,
  target: string,
  profile: Profile,
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
  const choices: Array<[boolean, ResolvedControl['paramKey'], ResolvedControl['kind']]> = [
    [
      target === 'safe_mode' ||
        target === 'safemode' ||
        control.id === 'safe_mode' ||
        control.id === 'safeMode',
      'safeMode',
      'safeMode',
    ],
    [
      target === 'reduced_motion' || control.id === 'reduced_motion',
      'reducedMotion',
      'reducedMotion',
    ],
    [target === 'audio_enabled' || control.id === 'audio_enabled', 'audioEnabled', 'audioEnabled'],
  ]
  const choice = choices.find(([matches]) => matches)
  return choice ? { control, paramKey: choice[1], kind: choice[2], defaultValue: false } : null
}

function controlDefault(
  control: UIControl,
  params: Record<string, unknown> | undefined,
  param: string,
) {
  return typeof params?.[param] === 'number'
    ? params[param]
    : control.type === 'toggle'
      ? false
      : (control.min ?? 0)
}

function resolveVideoControl(
  control: UIControl,
  target: string,
  profile: Profile,
  options?: BuildVideoNodesOptions,
): ResolvedControl | null | undefined {
  const parsed = parseScopedTarget(target, 'video')
  if (!parsed) return undefined
  const nodeIndex = getBuiltNodeIndex(profile, parsed.nodeId, options)
  if (nodeIndex === -1) return null
  const entry = profile.video_stack?.find(
    (node) =>
      (node.id ?? node.node ?? '').toLowerCase() === parsed.nodeId ||
      (node.node ?? '').toLowerCase() === parsed.nodeId,
  )
  return {
    control,
    paramKey: `${nodeIndex}.${parsed.param}`,
    kind: 'node',
    nodeIndex,
    defaultValue: controlDefault(control, entry?.params, parsed.param),
  }
}

function resolveAudioControl(
  control: UIControl,
  target: string,
  profile: Profile,
): ResolvedControl | null | undefined {
  const parsed = parseScopedTarget(target, 'audio')
  if (!parsed) return undefined
  const chain = profile.audio_stack?.chain ?? []
  const nodeIndex = chain.findIndex(
    (node) =>
      ((node as { id?: string }).id ?? node.node ?? '').toLowerCase() === parsed.nodeId ||
      node.node.toLowerCase() === parsed.nodeId,
  )
  if (nodeIndex === -1) return null
  return {
    control,
    paramKey: `audio.${nodeIndex}.${parsed.param}`,
    kind: 'node',
    nodeIndex,
    defaultValue: controlDefault(control, chain[nodeIndex]?.params, parsed.param),
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
  return (
    basicControl(control, target, profile) ??
    resolveVideoControl(control, target, profile, options) ??
    resolveAudioControl(control, target, profile) ??
    null
  )
}

/**
 * Build initial control values from profile (intensity, safeMode, node params).
 */
export function getDefaultControlValues(
  profile: Profile,
  options?: BuildVideoNodesOptions,
): Record<string, number | boolean> {
  const out: Record<string, number | boolean> = {}
  const safety = profile.safety
  out.intensity = typeof safety?.intensity_default === 'number' ? safety.intensity_default : 0.5
  out.safeMode = false
  out.reducedMotion = false
  out.audioEnabled = false
  for (let builtIndex = 0; ; builtIndex++) {
    const entry = getProfileEntryForBuiltIndex(profile, builtIndex, options)
    if (!entry) break
    for (const [param, value] of Object.entries(entry.params ?? {})) {
      if (typeof value === 'number' || typeof value === 'boolean') {
        out[`${builtIndex}.${param}`] = value
      }
    }
  }
  const controls = profile.ui?.controls ?? []
  for (const c of controls) {
    const resolved = resolveControl(c, profile, options)
    if (!resolved) continue
    out[resolved.paramKey] = resolved.defaultValue
  }
  return out
}
