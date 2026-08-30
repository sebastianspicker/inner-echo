import { collectVideoKeys } from './collectVideoKeys'

export function resolveVideoKeysFromIndex(
  videoIndex: Map<string, number[]>,
  target: string,
): string[] {
  const [scope, nodeId, ...paramParts] = target.trim().toLowerCase().split('.')
  if (scope !== 'video' || !nodeId || !paramParts.length) return []
  return collectVideoKeys(videoIndex, [nodeId], paramParts.join('.'))
}
