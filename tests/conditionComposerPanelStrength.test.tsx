// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Profile } from '../src/conditions/schema'
import {
  ConditionComposerPanel,
  type ConditionComposerPanelProps,
} from '../src/ui/ConditionComposerPanel'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const loadProfileMock = vi.fn<(id: string) => Promise<Profile | null>>()
const storageMock: Storage = {
  length: 0,
  clear: vi.fn(),
  getItem: vi.fn(() => null),
  key: vi.fn(() => null),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}

vi.mock('../src/conditions/loader', () => ({
  loadProfile: (id: string) => loadProfileMock(id),
}))

function makeProfile(id: string, dimensions: string[]): Profile {
  return {
    id,
    label: id,
    summary: `Profile ${id}`,
    framing: { type: 'metaphor' },
    experience_dimensions: dimensions.map((dimensionId) => ({ id: dimensionId, weight: 1 })),
    video_stack: [],
    safety: {
      intensity_default: 0.5,
      intensity_max: 1,
      warnings: [],
      safe_mode_clamps: {},
    },
    reactive: { analyser_to_params: [] },
    audio_stack: { enabled: false, chain: [] },
    ui: { controls: [] },
    references: { dimensions: [] },
  }
}

function buildProps(
  overrides: Partial<ConditionComposerPanelProps> = {},
): ConditionComposerPanelProps {
  return {
    catalog: [
      { id: 'alpha', label: 'Alpha' },
      { id: 'beta', label: 'Beta' },
      { id: 'gamma', label: 'Gamma' },
    ],
    mode: 'preset',
    onModeChange: vi.fn(),
    conditionId: 'alpha',
    onConditionIdChange: vi.fn(),
    presets: [],
    onPresetsChange: vi.fn(),
    dimensions: [],
    onDimensionsChange: vi.fn(),
    intensity: 0.5,
    onIntensityChange: vi.fn(),
    safeMode: false,
    onSafeModeChange: vi.fn(),
    reducedMotion: false,
    onReducedMotionChange: vi.fn(),
    audioEnabled: false,
    onAudioEnabledChange: vi.fn(),
    couplingStrength: 0.5,
    onCouplingStrengthChange: vi.fn(),
    maxFeedback: 0.35,
    onMaxFeedbackChange: vi.fn(),
    interactionAmount: 0.15,
    onInteractionAmountChange: vi.fn(),
    onOpenEvidence: vi.fn(),
    ...overrides,
  }
}

describe('ui/ConditionComposerPanel strength preload', () => {
  beforeEach(() => {
    loadProfileMock.mockReset()
    vi.stubGlobal('localStorage', storageMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('starts all profile loads before awaiting completion', async () => {
    const alpha = deferred<Profile | null>()
    const beta = deferred<Profile | null>()
    const gamma = deferred<Profile | null>()
    const pending = new Map<string, Deferred<Profile | null>>([
      ['alpha', alpha],
      ['beta', beta],
      ['gamma', gamma],
    ])

    loadProfileMock.mockImplementation(
      (id: string) => pending.get(id)?.promise ?? Promise.resolve(null),
    )

    render(<ConditionComposerPanel {...buildProps()} />)

    await waitFor(() => {
      expect(loadProfileMock).toHaveBeenCalledTimes(3)
    })
    expect(loadProfileMock.mock.calls.map(([id]) => id)).toEqual(['alpha', 'beta', 'gamma'])

    alpha.resolve(makeProfile('alpha', ['hyperarousal']))
    beta.resolve(makeProfile('beta', ['attention_fragmentation']))
    gamma.resolve(makeProfile('gamma', []))

    await waitFor(() => {
      expect(loadProfileMock).toHaveBeenCalledTimes(3)
    })
  })
})
