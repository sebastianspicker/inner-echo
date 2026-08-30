export interface ParsedScopedTarget {
  nodeId: string
  param: string
}

export function parseScopedTarget(
  target: string,
  scope: 'video' | 'audio',
): ParsedScopedTarget | null {
  const prefix = `${scope}.`
  const normalized = target.trim().toLowerCase()
  if (!normalized.startsWith(prefix)) return null
  const rest = normalized.slice(prefix.length)
  const dot = rest.indexOf('.')
  if (dot === -1) return null
  const nodeId = rest.slice(0, dot)
  const param = rest.slice(dot + 1)
  if (!nodeId || !param) return null
  return { nodeId, param }
}
