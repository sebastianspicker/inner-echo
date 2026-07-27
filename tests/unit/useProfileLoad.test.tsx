// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Profile } from '../../src/conditions/schema'
import { makeParams, makeProfile } from '../helpers/useProfileLoadFixtures'
import {
  createProfileLoader,
  useProfileForComposerMode,
  useProfileForCondition,
} from '../helpers/profileLoadTestSupport'

const loadProfileMock = vi.hoisted(() => vi.fn())
const composeEffectiveProfileMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/conditions/loader', () => ({
  loadProfile: loadProfileMock,
}))

vi.mock('../../src/composer', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    composeEffectiveProfile: composeEffectiveProfileMock,
  }
})

import { useProfileLoad } from '../../src/ui/hooks/useProfileLoad'

afterEach(() => {
  cleanup()
  loadProfileMock.mockReset()
  composeEffectiveProfileMock.mockReset()
})

describe('ui/hooks/useProfileLoad preset selection', () => {
  it('loads a preset profile without requiring an audio preference setter', async () => {
    loadProfileMock.mockResolvedValue(makeProfile('anxiety'))
    const params = makeParams({ audioEnabled: true })
    const { result } = renderHook(() => useProfileLoad(params))
    await waitFor(() => expect(result.current.profile?.id).toBe('anxiety'))
  })
  it(
    'clears loading state when a stale preset load resolves after a newer selection',
    stalePresetLoadDoesNotSetLoadingState,
  )
})

describe('ui/hooks/useProfileLoad failures and retries', () => {
  it(
    'uses an explicit fallback instead of stale profile state when composition rejects',
    compositionFailureUsesFallback,
  )
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function stalePresetLoadDoesNotSetLoadingState(): Promise<void> {
  const slow = deferred<Profile>()
  const fast = deferred<Profile>()
  loadProfileMock.mockImplementation(createProfileLoader(slow.promise, fast.promise))

  const params = makeParams()
  const { result, rerender } = renderHook(
    ({ conditionId }) => useProfileForCondition(params, conditionId),
    { initialProps: { conditionId: 'slow' } },
  )

  await waitFor(() => expect(result.current.isProfileLoading).toBe(true))
  rerender({ conditionId: 'fast' })

  await act(async () => {
    fast.resolve(makeProfile('fast'))
    await fast.promise
  })

  await waitFor(() => {
    expect(result.current.profile?.id).toBe('fast')
    expect(result.current.profileLoadStatus).toBe('ready')
  })
  expect(result.current.isProfileLoading).toBe(false)

  await act(async () => {
    slow.resolve(makeProfile('slow'))
    await slow.promise
  })

  await waitFor(() => expect(result.current.isProfileLoading).toBe(false))
  expect(result.current.profile?.id).toBe('fast')
  expect(result.current.profileLoadStatus).toBe('ready')
}

function expectComposedFallback(result: ReturnType<typeof useProfileLoad>): void {
  const profile = result.profile
  expect(profile?.id).toBe('composed_fallback')
  expect(result.isProfileLoading).toBe(false)
  expect(result.profileLoadStatus).toBe('error')
  expect(result.profileLoadError).toMatch(/clean fallback/i)
  expect(profile?.video_stack).toEqual([])
  expect(result.composeReport).toBeNull()
}

async function compositionFailureUsesFallback(): Promise<void> {
  loadProfileMock.mockResolvedValue(makeProfile('anxiety'))
  composeEffectiveProfileMock.mockRejectedValue(new Error('compose failed'))
  const params = makeParams()
  const multimorbidPresets = [{ profileId: 'panic', weight: 1 }]

  const { result, rerender } = renderHook(
    ({ composerMode }) => useProfileForComposerMode(params, composerMode, multimorbidPresets),
    { initialProps: { composerMode: 'preset' as const } },
  )

  await waitFor(() => expect(result.current.profile?.id).toBe('anxiety'))
  rerender({ composerMode: 'multimorbid' })
  await waitFor(() => expect(composeEffectiveProfileMock).toHaveBeenCalled())
  await waitFor(() => expectComposedFallback(result.current))
  expect(result.current.profile?.id).not.toBe('anxiety')
}

describe('ui/hooks/useProfileLoad preset retry states', () => {
  it('retries a rejected preset load and clears the explicit error state on success', async () => {
    loadProfileMock
      .mockRejectedValueOnce(new Error('profile unavailable'))
      .mockResolvedValueOnce(makeProfile('anxiety'))
    const params = makeParams()

    const { result } = renderHook(() => useProfileLoad(params))

    await waitFor(() => {
      expect(result.current.profileLoadStatus).toBe('error')
      expect(result.current.profile?.id).toBe('none')
    })

    act(() => result.current.retryProfileLoad())

    await waitFor(() => {
      expect(result.current.profileLoadStatus).toBe('ready')
      expect(result.current.profileLoadError).toBeNull()
      expect(result.current.profile?.id).toBe('anxiety')
    })
    expect(loadProfileMock).toHaveBeenCalledTimes(2)
  })

  it('does not report ready when the preset loader returns no profile', async () => {
    loadProfileMock.mockResolvedValue(null)
    const params = makeParams()

    const { result } = renderHook(() => useProfileLoad(params))

    await waitFor(() => {
      expect(result.current.profileLoadStatus).toBe('error')
      expect(result.current.isProfileLoading).toBe(false)
      expect(result.current.profile?.id).toBe('none')
    })
  })
})
