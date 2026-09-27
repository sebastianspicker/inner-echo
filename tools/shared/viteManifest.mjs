export function collectChunkClosure(manifest, initialKeys, { includeDynamicImports = true } = {}) {
  const seen = new Set()
  const pending = [...initialKeys]

  while (pending.length > 0) {
    const key = pending.pop()
    if (!key || seen.has(key)) continue

    seen.add(key)
    const chunk = manifest[key]
    pending.push(...(chunk?.imports ?? []))
    if (includeDynamicImports) pending.push(...(chunk?.dynamicImports ?? []))
  }

  return [...seen]
}
