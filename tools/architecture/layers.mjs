import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Layers the demo entry may depend on. Shared with `check-imports.mjs`
 * (source dependency-direction enforcement) so `verify-pages-build.mjs` can
 * derive the demo bundle's forbidden production layers from the same source
 * of truth instead of a hand-maintained regex.
 */
export const demoAllowedLayers = new Set(['demo', 'shared'])

/** Top-level layer directories under `src/`. */
export function listSourceLayers(root) {
  return readdirSync(resolve(root, 'src'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}
