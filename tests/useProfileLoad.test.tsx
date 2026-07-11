// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Profile } from '../src/conditions/schema'
import type { UseProfileLoadParams } from '../src/ui/hooks/useProfileLoad'

const loadProfileMock = vi.hoisted(() => vi.fn())
const composeEffectiveProfileMock = vi.hoisted(() => vi.fn())

vi.mock('../src/conditions/loader', () => ({
  loadProfile: loadProfileMock,
}))

vi.mock('../src/composer', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    composeEffectiveProfile: composeEffectiveProfileMock,
  }
})

import { useProfileLoad } from '../src/ui/hooks/useProfileLoad'

function makeProfile(id: string): Profile {
  return {
    id,
    label: id,
    summary: id,
    framing: { type: 'metaphor' },
    experience_dimensions: [],
    video_stack: [{ node: 'grain', params: { amount: 0.1 } }],
    safety: {
      intensity_default: 0.5,
      intensity_max: 1,
      warnings: [],
      safe_mode_clamps: {},
    },
    audio_stack: {
      enabled: true,
      input: 'synth',
      master: { volume: 0.2 },
      chain: [{ node: 'noise_bed', params: { level: 0.02 } }],
    },
    reactive: { analyser_to_params: [] },
    ui: { controls: [] },
    references: { dimensions: [] },
  }
}

function makeParams(overrides: Partial<UseProfileLoadParams> = {}): UseProfileLoadParams {
  return {
    conditionId: 'anxiety',
    composerMode: 'preset',
    selectedPresets: [],
    selectedDimensions: [],
    setIntensity: vi.fn(),
    intensity: 0.5,
    safeMode: false,
    reducedMotion: false,
    audioEnabled: true,
    maxFeedback: 0.35,
    interactionAmount: 0.15,
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

afterEach(() => {
  cleanup()
  loadProfileMock.mockReset()
  composeEffectiveProfileMock.mockReset()
})

describe('ui/hooks/useProfileLoad preset loading', () => {
  it('loads a preset profile without requiring an audio preference setter', async () => {
    loadProfileMock.mockResolvedValue(makeProfile('anxiety'))
    const params = makeParams({ audioEnabled: true })

    const { result } = renderHook(() => useProfileLoad(params))

    await waitFor(() => {
      expect(result.current.profile?.id).toBe('anxiety')
    })
  })
})

describe('ui/hooks/useProfileLoad stale requests', () => {
  it('clears loading state when a stale preset load resolves after a newer selection', async () => {
    const slow = deferred<Profile>()
    const fast = deferred<Profile>()
    loadProfileMock.mockImplementation((conditionId: string) => {
      if (conditionId === 'slow') return slow.promise
      if (conditionId === 'fast') return fast.promise
      return Promise.resolve(makeProfile(conditionId))
    })

    const params = makeParams()
    const { result, rerender } = renderHook(
      ({ conditionId }) => useProfileLoad({ ...params, conditionId }),
      { initialProps: { conditionId: 'slow' } },
    )

    await waitFor(() => {
      expect(result.current.isProfileLoading).toBe(true)
    })

    rerender({ conditionId: 'fast' })

    await act(async () => {
      fast.resolve(makeProfile('fast'))
      await fast.promise
    })

    await waitFor(() => {
      expect(result.current.profile?.id).toBe('fast')
    })

    await act(async () => {
      slow.resolve(makeProfile('slow'))
      await slow.promise
    })

    await waitFor(() => {
      expect(result.current.isProfileLoading).toBe(false)
    })
    expect(result.current.profile?.id).toBe('fast')
  })
})

describe('ui/hooks/useProfileLoad composition fallback', () => {
  it('uses an explicit fallback instead of stale profile state when composition rejects', async () => {
    loadProfileMock.mockResolvedValue(makeProfile('anxiety'))
    composeEffectiveProfileMock.mockRejectedValue(new Error('compose failed'))
    const params = makeParams()
    const multimorbidPresets = [{ profileId: 'panic', weight: 1 }]

    const { result, rerender } = renderHook(
      ({ composerMode }) =>
        useProfileLoad({
          ...params,
          composerMode,
          selectedPresets: composerMode === 'multimorbid' ? multimorbidPresets : [],
        }),
      { initialProps: { composerMode: 'preset' as const } },
    )

    await waitFor(() => {
      expect(result.current.profile?.id).toBe('anxiety')
    })

    rerender({ composerMode: 'multimorbid' })

    await waitFor(() => {
      expect(composeEffectiveProfileMock).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(result.current.profile?.id).toBe('composed_fallback')
      expect(result.current.isProfileLoading).toBe(false)
    })
    expect(result.current.profile?.id).not.toBe('anxiety')
    expect(result.current.profile?.video_stack).toEqual([])
    expect(result.current.composeReport).toBeNull()
  })
})
