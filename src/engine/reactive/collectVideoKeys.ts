export function collectVideoKeys(
  videoIndex: Map<string, number[]>,
  nodeIds: string[],
  param: string,
): string[] {
  const indices = new Set<number>()
  for (const id of nodeIds) {
    const matches = videoIndex.get(id)
    if (!matches) continue
    for (const index of matches) indices.add(index)
  }
  return [...indices].map((index) => `${index}.${param}`)
}
