import {
  getBuiltNodeIndex,
  type BuildVideoNodesOptions,
} from '../../../domain/experience/videoStack'
import type { Profile, UIControl } from '../../../domain/experience/schema'
import { parseScopedTarget } from '../../../domain/experience/parameterTarget'
import { resolveVideoStackOptions } from './controlDefaultBuilder'

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
  options?: Partial<BuildVideoNodesOptions>,
): ResolvedControl | null {
  const parsed = parseScopedTarget(target, 'video')
  if (!parsed) return null
  const { nodeId, param } = parsed
  const nodeIndex = getBuiltNodeIndex(profile, nodeId, resolveVideoStackOptions(options))
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
  options?: Partial<BuildVideoNodesOptions>,
): ResolvedControl | null {
  const target = (control.target ?? control.id ?? '').toLowerCase()
  return (
    resolveGlobalControl(control, profile, target) ??
    resolveVideoControl(control, profile, target, options) ??
    resolveAudioControl(control, profile, target)
  )
}
