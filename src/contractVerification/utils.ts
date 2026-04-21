/**
 * Shared utilities for contract-verification probe harnesses.
 */

/**
 * Temporarily replaces `Math.random` with a deterministic LCG seeded by
 * `seed`, executes `fn`, then restores the original `Math.random`.
 *
 * Used by both the in-browser contract verification harness and the
 * Node-based inspect harness script so that noise-buffer generation and
 * other random-dependent audio paths produce reproducible results.
 */
export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const prev = Math.random
  let state = seed >>> 0
  Math.random = () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x100000000
  }
  try {
    return fn()
  } finally {
    Math.random = prev
  }
}

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
    // biome-ignore lint/suspicious/noPrototypeBuiltins: Object.hasOwn requires ES2022 lib
    if (!Object.prototype.hasOwnProperty.call(obj, part)) return undefined
    current = obj[part]
  }
  return current
}
