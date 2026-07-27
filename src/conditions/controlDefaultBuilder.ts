import type { Profile } from './schema'
import { getProfileEntryForBuiltIndex, type BuildVideoNodesOptions } from './graphBuilder'

export function addBuiltNodeDefaults(args: {
  out: Record<string, number | boolean>
  profile: Profile
  options?: BuildVideoNodesOptions
}): void {
  const { out, profile, options } = args
  for (let builtIndex = 0; ; builtIndex++) {
    const entry = getProfileEntryForBuiltIndex(profile, builtIndex, options)
    if (!entry) return
    for (const [param, value] of Object.entries(entry.params ?? {})) {
      if (typeof value === 'number' || typeof value === 'boolean')
        out[`${builtIndex}.${param}`] = value
    }
  }
}
