// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { useAsyncEffect } from '../src/ui/hooks/useAsyncEffect'

afterEach(cleanup)

describe('ui/hooks/useAsyncEffect', () => {
  it('calls the load function on mount', async () => {
    const loadFn = vi.fn(async () => {})
    renderHook(() => useAsyncEffect(loadFn, []))
    expect(loadFn).toHaveBeenCalledOnce()
  })

  it('passes a context object with cancelled = false initially', async () => {
    let capturedCtx: { cancelled: boolean } | null = null
    renderHook(() =>
      useAsyncEffect(async (ctx) => {
        capturedCtx = ctx
      }, []),
    )
    expect(capturedCtx).not.toBeNull()
    expect(capturedCtx!.cancelled).toBe(false)
  })

  it('sets cancelled = true on unmount', async () => {
    let capturedCtx: { cancelled: boolean } | null = null
    const { unmount } = renderHook(() =>
      useAsyncEffect(async (ctx) => {
        capturedCtx = ctx
      }, []),
    )
    expect(capturedCtx!.cancelled).toBe(false)
    unmount()
    expect(capturedCtx!.cancelled).toBe(true)
  })

  it('sets cancelled = true on dependency change before re-run', async () => {
    const contexts: Array<{ cancelled: boolean }> = []
    const { rerender } = renderHook(
      ({ dep }) =>
        useAsyncEffect(
          async (ctx) => {
            contexts.push(ctx)
          },
          [dep],
        ),
      { initialProps: { dep: 1 } },
    )

    expect(contexts).toHaveLength(1)
    expect(contexts[0].cancelled).toBe(false)

    // Re-render with a new dependency value
    rerender({ dep: 2 })

    // First context should now be cancelled; second should not
    expect(contexts).toHaveLength(2)
    expect(contexts[0].cancelled).toBe(true)
    expect(contexts[1].cancelled).toBe(false)
  })

  it('calls onError when the load function rejects', async () => {
    const onError = vi.fn()
    const error = new Error('async failure')

    renderHook(() =>
      useAsyncEffect(
        async () => {
          throw error
        },
        [],
        { onError },
      ),
    )

    // Wait for the microtask (promise rejection) to flush
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledOnce()
    })
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('does not call onError if cancelled before rejection is handled', async () => {
    const onError = vi.fn()
    let rejectFn: (err: Error) => void

    const { unmount } = renderHook(() =>
      useAsyncEffect(
        async () => {
          await new Promise<void>((_resolve, reject) => {
            rejectFn = reject
          })
        },
        [],
        { onError },
      ),
    )

    // Unmount first (sets cancelled = true), then reject
    unmount()
    rejectFn!(new Error('late failure'))

    // Give microtask queue time to flush
    await new Promise((r) => setTimeout(r, 10))
    expect(onError).not.toHaveBeenCalled()
  })

  it('does not call onError when no onError option is provided', async () => {
    // Should not throw an unhandled rejection
    const { unmount } = renderHook(() =>
      useAsyncEffect(async () => {
        throw new Error('no handler')
      }, []),
    )

    // Give microtask queue time to flush without crashing
    await new Promise((r) => setTimeout(r, 10))
    unmount()
  })
})
