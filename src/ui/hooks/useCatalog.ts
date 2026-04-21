import { useState } from 'react'
import { loadCatalog } from '../../conditions/loader'
import type { CatalogEntry } from '../../conditions/schema'
import { useAsyncEffect } from './useAsyncEffect'
import { logger } from '../../utils/logger'

/**
 * Loads the condition catalog once on mount. Returns catalog list or null while loading / on error.
 */
export function useCatalog(): CatalogEntry[] | null {
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null)
  useAsyncEffect(
    async (ctx) => {
      const c = await loadCatalog()
      if (ctx.cancelled) return
      if (c?.conditions?.length) setCatalog(c.conditions)
    },
    [],
    { onError: (err) => logger.error('loadCatalog failed', err) },
  )
  return catalog
}
