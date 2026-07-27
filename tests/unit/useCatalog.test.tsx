// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const loadCatalogMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/conditions/loader', () => ({ loadCatalog: loadCatalogMock }))

import { useCatalog } from '../../src/ui/hooks/useCatalog'

describe('ui/hooks/useCatalog', () => {
  afterEach(() => {
    cleanup()
    loadCatalogMock.mockReset()
  })

  it('exposes rejection as an error and retries without treating it as loading', async () => {
    loadCatalogMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      version: '1',
      conditions: [{ id: 'anxiety', label: 'Anxiety', summary: 'Test' }],
    })

    const { result } = renderHook(() => useCatalog())

    await waitFor(() => {
      expect(result.current.status).toBe('error')
      expect(result.current.catalog).toBeNull()
      expect(result.current.error).toMatch(/could not be loaded/i)
    })

    act(() => result.current.retry())

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
      expect(result.current.error).toBeNull()
      expect(result.current.catalog?.map((entry) => entry.id)).toEqual(['anxiety'])
    })
    expect(loadCatalogMock).toHaveBeenCalledTimes(2)
  })

  it('treats an empty loader result as an explicit error', async () => {
    loadCatalogMock.mockResolvedValue(null)

    const { result } = renderHook(() => useCatalog())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.catalog).toBeNull()
  })
})
