/**
 * Phase 6: Resolve profile ui.controls target to pipeline param key and default value.
 * target "intensity" -> global intensity; "video.<nodeId>.<param>" -> nodeIndex.param.
 */

import type { Profile, UIControl, VideoStackNodeDef } from './schema'

export interface ResolvedControl {
  control: UIControl
  /** Key for pipeline: "intensity", "safeMode", or "nodeIndex.param" */
  paramKey: string
  /** "intensity" | "safeMode" | "reducedMotion" | "audioEnabled" | "node" */
  kind: 'intensity' | 'safeMode' | 'reducedMotion' | 'audioEnabled' | 'node'
  nodeIndex?: number
  defaultValue: number | boolean
}

/**
 * Resolve a control's target to a param key and default value using the profile.
 */
export function resolveControl(
  control: UIControl,
  profile: Profile
): ResolvedControl | null {
  const target = (control.target ?? control.id ?? '').toLowerCase()
  if (target === 'intensity' || (control.id === 'intensity' && !control.target)) {
    const def = (profile as { safety?: { intensity_default?: number } }).safety
      ?.intensity_default
    return {
      control,
      paramKey: 'intensity',
      kind: 'intensity',
      defaultValue: typeof def === 'number' ? def : 0.5,
    }
  }
  if (
    target === 'safe_mode' ||
    target === 'safemode' ||
    control.id === 'safe_mode' ||
    control.id === 'safeMode'
  ) {
    return {
      control,
      paramKey: 'safeMode',
      kind: 'safeMode',
      defaultValue: false,
    }
  }
  if (target === 'reduced_motion' || control.id === 'reduced_motion') {
    return {
      control,
      paramKey: 'reducedMotion',
      kind: 'reducedMotion',
      defaultValue: false,
    }
  }
  if (target === 'audio_enabled' || control.id === 'audio_enabled') {
    return {
      control,
      paramKey: 'audioEnabled',
      kind: 'audioEnabled',
      defaultValue: false,
    }
  }
  const videoPrefix = 'video.'
  if (target.startsWith(videoPrefix)) {
    const rest = target.slice(videoPrefix.length)
    const dot = rest.indexOf('.')
    if (dot === -1) return null
    const nodeId = rest.slice(0, dot)
    const param = rest.slice(dot + 1)
    const stack = profile.video_stack as VideoStackNodeDef[]
    const nodeIndex = stack.findIndex(
      (n) =>
        (n.id ?? n.node ?? '').toLowerCase() === nodeId ||
        (n.node ?? '').toLowerCase() === nodeId
    )
    if (nodeIndex === -1) return null
    const entry = stack[nodeIndex]
    const params = entry?.params as Record<string, unknown> | undefined
    const defaultValue =
      params && typeof params[param] === 'number'
        ? (params[param] as number)
        : control.type === 'toggle'
          ? false
          : (control.min ?? 0)
    return {
      control,
      paramKey: `${nodeIndex}.${param}`,
      kind: 'node',
      nodeIndex,
      defaultValue,
    }
  }
  return null
}

/**
 * Build initial control values from profile (intensity, safeMode, node params).
 */
export function getDefaultControlValues(profile: Profile): Record<string, number | boolean> {
  const out: Record<string, number | boolean> = {}
  const safety = (profile as { safety?: { intensity_default?: number } }).safety
  out.intensity = typeof safety?.intensity_default === 'number' ? safety.intensity_default : 0.5
  out.safeMode = false
  out.reducedMotion = false
  out.audioEnabled = false
  const controls = profile.ui?.controls ?? []
  for (const c of controls) {
    const resolved = resolveControl(c, profile)
    if (!resolved) continue
    out[resolved.paramKey] = resolved.defaultValue
  }
  return out
}
