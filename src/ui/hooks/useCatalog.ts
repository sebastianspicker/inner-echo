import { useCallback, useState } from 'react'
import { loadCatalog } from '../../conditions/loader'
import type { CatalogEntry } from '../../conditions/schema'
import { useAsyncEffect } from './useAsyncEffect'
import { logger } from '../../utils/logger'

export type CatalogLoadStatus = 'loading' | 'ready' | 'error'

export interface CatalogLoadResult {
  catalog: CatalogEntry[] | null
  status: CatalogLoadStatus
  error: string | null
  retry(): void
}

/** Loads the condition catalog and exposes failure separately from loading. */
export function useCatalog(): CatalogLoadResult {
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null)
  const [status, setStatus] = useState<CatalogLoadStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const retry = useCallback(() => setRetryToken((value) => value + 1), [])

  useAsyncEffect(
    async (ctx) => {
      setStatus('loading')
      setError(null)
      try {
        const loaded = await loadCatalog()
        if (ctx.cancelled) return
        if (!loaded?.conditions?.length) {
          setCatalog(null)
          setStatus('error')
          setError('The experience catalog could not be loaded.')
          return
        }
        setCatalog(loaded.conditions)
        setStatus('ready')
      } catch (err) {
        if (ctx.cancelled) return
        setCatalog(null)
        setStatus('error')
        setError('The experience catalog could not be loaded.')
        logger.error('loadCatalog failed', err)
      }
    },
    [retryToken],
    { onError: (err) => logger.error('loadCatalog failed', err) },
  )
  return { catalog, status, error, retry }
}
