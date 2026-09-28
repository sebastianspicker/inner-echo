import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Load a bundled repository JSON file. All inputs are trusted, plain JSON
 * content (schemas, profiles, mappings) — no markdown fences or surrounding
 * text to strip.
 */
export function loadRepoJson<T>(rootDir: string, pathFromRoot: string): T {
  return JSON.parse(readFileSync(join(rootDir, pathFromRoot), 'utf-8')) as T
}
