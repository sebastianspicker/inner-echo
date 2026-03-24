/**
 * Shared utilities for contract-verification probe harnesses.
 */

/**
 * Walks a dot-separated property path on an arbitrary object tree.
 *
 * Returns `undefined` when any segment along the path is missing or the
 * current value is not an object.
 *
 * @example
 * ```ts
 * getByPath({ a: { b: 42 } }, 'a.b') // => 42
 * getByPath({ a: { b: 42 } }, 'a.c') // => undefined
 * ```
 */
export function getByPath(root: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean)
  let current: unknown = root
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    const obj = current as Record<string, unknown>
    if (!Object.prototype.hasOwnProperty.call(obj, part)) return undefined
    current = obj[part]
  }
  return current
}
