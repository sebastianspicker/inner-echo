/**
 * Load condition catalog and profiles with validation.
 * loadProfile(id) validates required fields (id, label, video_stack).
 * Unknown node types are not rejected here — the graph builder skips them with a warning.
 */

import { catalogSchema, profileSchema, type Catalog, type Profile } from './schema'
import { logger } from '../utils/logger'

// Canonical condition data lives under `src/conditions/**`.
const loadCatalogModule = () => import('./catalog.json')

// All profile JSONs bundled; load by id via glob (each module default = parsed JSON)
const profileModules = import.meta.glob<{ default: Record<string, unknown> }>('./profiles/*.json')
const profileLoaders = new Map(Object.entries(profileModules))

function getProfilePath(id: string): string {
  return `./profiles/${id}.json`
}

function isProfileId(id: string): boolean {
  if (id.length === 0 || id.startsWith('_') || id.endsWith('_')) return false
  let previousWasSeparator = false
  for (const character of id) {
    if (character === '_') {
      if (previousWasSeparator) return false
      previousWasSeparator = true
      continue
    }
    const code = character.charCodeAt(0)
    const isLowercaseLetter = code >= 97 && code <= 122
    const isDigit = code >= 48 && code <= 57
    if (!isLowercaseLetter && !isDigit) return false
    previousWasSeparator = false
  }
  return true
}

/**
 * Load and validate the conditions catalog.
 * Returns null on failure (invalid JSON or validation error); logs to console.
 */
export async function loadCatalog(): Promise<Catalog | null> {
  try {
    const mod = await loadCatalogModule()
    const raw = mod.default
    const parsed = catalogSchema.safeParse(raw)
    if (!parsed.success) {
      logger.warn('[conditions] Catalog validation failed:', parsed.error.flatten())
      return null
    }
    return parsed.data
  } catch (e) {
    logger.warn('[conditions] Error loading catalog:', e)
    return null
  }
}

/**
 * Load and validate a single profile by id.
 * Required fields: id, label, video_stack.
 * Returns null on missing file, parse error, or validation failure; logs warning.
 */
export async function loadProfile(id: string): Promise<Profile | null> {
  if (!isProfileId(id)) {
    logger.warn('[conditions] loadProfile: invalid id')
    return null
  }
  try {
    const path = getProfilePath(id)
    const loader = profileLoaders.get(path)
    if (!loader) {
      logger.warn('[conditions] Profile not found:', id)
      return null
    }
    const mod = await loader()
    const data = mod.default
    const parsed = profileSchema.safeParse(data)
    if (!parsed.success) {
      logger.warn('[conditions] Profile validation failed for', id, parsed.error.flatten())
      return null
    }
    return parsed.data
  } catch (e) {
    logger.warn('[conditions] Error loading profile:', id, e)
    return null
  }
}
