import { useEffect, type DependencyList } from 'react'

/** Context passed to the async effect; check ctx.cancelled after awaits before updating state. */
export interface AsyncEffectContext {
  readonly cancelled: boolean
}

/**
 * Runs an async load function when deps change. On cleanup, sets a cancelled flag so the
 * load can skip updating state after unmount or when deps change again. Optional onError
 * is called for unhandled rejections (e.g. for logging).
 */
export function useAsyncEffect(
  loadFn: (ctx: AsyncEffectContext) => Promise<void>,
  deps: DependencyList,
  options?: { onError?: (err: unknown) => void },
): void {
  useEffect(() => {
    let cancelled = false
    const ctx: AsyncEffectContext = {
      get cancelled() {
        return cancelled
      },
    }
    loadFn(ctx).catch((err) => {
      if (!cancelled && options?.onError) options.onError(err)
    })
    return () => {
      cancelled = true
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps forwarded from caller
  }, deps)
}
