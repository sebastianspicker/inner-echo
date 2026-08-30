import type { Profile } from '../../../domain/experience/schema'
import {
  getProfileEntryForBuiltIndex,
  type BuildVideoNodesOptions,
} from '../../../domain/experience/videoStack'
import { IMPLEMENTED_VIDEO_NODES } from '../../../runtime/capabilities'

export function resolveVideoStackOptions(
  options?: Partial<BuildVideoNodesOptions>,
): BuildVideoNodesOptions {
  return { supportedNodeIds: IMPLEMENTED_VIDEO_NODES, ...options }
}

export function addBuiltNodeDefaults(args: {
  out: Record<string, number | boolean>
  profile: Profile
  options?: Partial<BuildVideoNodesOptions>
}): void {
  const { out, profile } = args
  const options = resolveVideoStackOptions(args.options)
  for (let builtIndex = 0; ; builtIndex++) {
    const entry = getProfileEntryForBuiltIndex(profile, builtIndex, options)
    if (!entry) return
    for (const [param, value] of Object.entries(entry.params ?? {})) {
      if (typeof value === 'number' || typeof value === 'boolean')
        out[`${builtIndex}.${param}`] = value
    }
  }
}
