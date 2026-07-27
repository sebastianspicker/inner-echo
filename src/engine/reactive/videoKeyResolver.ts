const VIDEO_NODE_ALIASES: Record<string, string[]> = {
  chroma_aberration: ['chroma_aberration', 'chromatic_aberration'],
  chromatic_aberration: ['chromatic_aberration', 'chroma_aberration'],
}
import { collectVideoKeys } from './collectVideoKeys'

export function resolveVideoKeysFromIndex(
  videoIndex: Map<string, number[]>,
  target: string,
): string[] {
  const [scope, nodeId, ...paramParts] = target.trim().toLowerCase().split('.')
  if (scope !== 'video' || !nodeId || !paramParts.length) return []
  return collectVideoKeys(videoIndex, VIDEO_NODE_ALIASES[nodeId] ?? [nodeId], paramParts.join('.'))
}
