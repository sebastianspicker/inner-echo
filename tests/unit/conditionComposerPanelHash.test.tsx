// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  ConditionComposerPanel,
  type ConditionComposerPanelProps,
} from '../../src/ui/ConditionComposerPanel'
import { encodePresetToHash } from '../../src/ui/presetShare'
import {
  LEGACY_PRESET_STORAGE_KEY,
  PRESET_LIBRARY_STORAGE_KEY,
  createPresetSnapshot,
  type PresetPayload,
} from '../../src/ui/presetSnapshot'
import { assertValidLegacyMigrationIsRetained } from '../helpers/conditionComposerMigrationAssertions'

const storageMap = new Map<string, string>()
const storageMock: Storage = {
  get length() {
    return storageMap.size
  },
  clear: () => storageMap.clear(),
  getItem: (key: string) => storageMap.get(key) ?? null,
  key: (index: number) => [...storageMap.keys()][index] ?? null,
  removeItem: (key: string) => storageMap.delete(key),
  setItem: (key: string, value: string) => storageMap.set(key, value),
}

function buildProps(
  overrides: Partial<ConditionComposerPanelProps> = {},
): ConditionComposerPanelProps & {
  __spies: {
    onModeChange: ReturnType<typeof vi.fn>
    onConditionIdChange: ReturnType<typeof vi.fn>
    onPresetsChange: ReturnType<typeof vi.fn>
    onDimensionsChange: ReturnType<typeof vi.fn>
    onIntensityChange: ReturnType<typeof vi.fn>
    onSafeModeChange: ReturnType<typeof vi.fn>
    onReducedMotionChange: ReturnType<typeof vi.fn>
    onAudioEnabledChange: ReturnType<typeof vi.fn>
    onCouplingStrengthChange: ReturnType<typeof vi.fn>
    onMaxFeedbackChange: ReturnType<typeof vi.fn>
    onInteractionAmountChange: ReturnType<typeof vi.fn>
  }
} {
  const spies = {
    onModeChange: vi.fn(),
    onConditionIdChange: vi.fn(),
    onPresetsChange: vi.fn(),
    onDimensionsChange: vi.fn(),
    onIntensityChange: vi.fn(),
    onSafeModeChange: vi.fn(),
    onReducedMotionChange: vi.fn(),
    onAudioEnabledChange: vi.fn(),
    onCouplingStrengthChange: vi.fn(),
    onMaxFeedbackChange: vi.fn(),
    onInteractionAmountChange: vi.fn(),
  }

  return {
    catalog: [],
    mode: 'preset',
    onModeChange: spies.onModeChange,
    conditionId: 'none',
    onConditionIdChange: spies.onConditionIdChange,
    presets: [],
    onPresetsChange: spies.onPresetsChange,
    dimensions: [],
    onDimensionsChange: spies.onDimensionsChange,
    intensity: 0.5,
    onIntensityChange: spies.onIntensityChange,
    safeMode: true,
    onSafeModeChange: spies.onSafeModeChange,
    reducedMotion: false,
    onReducedMotionChange: spies.onReducedMotionChange,
    audioEnabled: false,
    onAudioEnabledChange: spies.onAudioEnabledChange,
    couplingStrength: 0.5,
    onCouplingStrengthChange: spies.onCouplingStrengthChange,
    maxFeedback: 0.35,
    onMaxFeedbackChange: spies.onMaxFeedbackChange,
    interactionAmount: 0.15,
    onInteractionAmountChange: spies.onInteractionAmountChange,
    onOpenEvidence: vi.fn(),
    __spies: spies,
    ...overrides,
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
  storageMap.clear()
  vi.stubGlobal('localStorage', storageMock)
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
  storageMap.clear()
  vi.unstubAllGlobals()
})

async function assertCorruptPresetLibraryStorage(): Promise<void> {
  storageMap.set(PRESET_LIBRARY_STORAGE_KEY, 'not valid json {{{')
  const props = buildProps()

  const { getByRole } = render(<ConditionComposerPanel {...props} />)

  await waitFor(() => {
    expect(getByRole('alert').textContent).toMatch(/saved preset library could not be read/i)
  })
  expect(storageMap.get(PRESET_LIBRARY_STORAGE_KEY)).toBe('not valid json {{{')
}

async function assertInvalidLegacyMigrationIsPreserved(): Promise<void> {
  const legacy = JSON.stringify({ conditionId: 'bad id with spaces' })
  storageMap.set(LEGACY_PRESET_STORAGE_KEY, legacy)
  const props = buildProps()

  const { getByRole } = render(<ConditionComposerPanel {...props} />)

  await waitFor(() => {
    expect(getByRole('alert').textContent).toMatch(/legacy preset storage could not be migrated/i)
  })
  expect(storageMap.get(LEGACY_PRESET_STORAGE_KEY)).toBe(legacy)
  expect(storageMap.has(PRESET_LIBRARY_STORAGE_KEY)).toBe(false)
}

async function applySharedPresetHashOnce(): Promise<void> {
  const payload: PresetPayload = {
    mode: 'multimorbid',
    conditionId: 'panic',
    presets: [{ profileId: 'panic', weight: 0.6 }],
    dimensions: [],
    intensity: 0.42,
    safeMode: false,
    reducedMotion: true,
    audioEnabled: true,
    couplingStrength: 0.73,
    maxFeedback: 0.27,
    interactionAmount: 0.19,
  }

  window.history.replaceState({}, '', encodePresetToHash(payload))
  const props = buildProps()
  const { rerender } = render(<ConditionComposerPanel {...props} />)

  await waitFor(() => expect(props.__spies.onModeChange).toHaveBeenCalledTimes(1))
  expect(props.__spies.onModeChange).toHaveBeenCalledWith('multimorbid')
  expect(props.__spies.onConditionIdChange).toHaveBeenCalledWith('panic')
  expect(props.__spies.onAudioEnabledChange).toHaveBeenCalledWith(false)
  expect(window.location.hash).toBe('')

  rerender(<ConditionComposerPanel {...props} conditionId="anxiety" />)

  await waitFor(() => {
    expect(props.__spies.onModeChange).toHaveBeenCalledTimes(1)
    expect(props.__spies.onConditionIdChange).toHaveBeenCalledTimes(1)
    expect(props.__spies.onAudioEnabledChange).toHaveBeenCalledTimes(1)
  })
}

async function undoDeletedPresetKeepsPayload(): Promise<void> {
  const payload: PresetPayload = {
    mode: 'symptom',
    conditionId: 'none',
    presets: [],
    dimensions: [{ dimensionId: 'hyperarousal', weight: 0.6 }],
    intensity: 0.4,
    safeMode: true,
    reducedMotion: true,
    audioEnabled: false,
    couplingStrength: 0.5,
    maxFeedback: 0.3,
    interactionAmount: 0.2,
  }
  const snapshot = createPresetSnapshot(payload, {
    name: 'Undo fixture',
    createdAt: '2026-07-11T12:00:00.000Z',
  })
  storageMap.set(PRESET_LIBRARY_STORAGE_KEY, JSON.stringify([snapshot]))

  render(<ConditionComposerPanel {...buildProps()} />)
  await waitFor(() =>
    expect((document.getElementById('saved-setup-select') as HTMLSelectElement | null)?.value).toBe(
      snapshot.id,
    ),
  )
  fireEvent.click(screen.getByText('Saved setups & sharing'))
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

  expect(JSON.parse(storageMap.get(PRESET_LIBRARY_STORAGE_KEY) ?? '[]')).toEqual([])
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
  const restored = JSON.parse(storageMap.get(PRESET_LIBRARY_STORAGE_KEY) ?? '[]')
  expect(restored).toHaveLength(1)
  expect(restored[0].payload).toEqual(snapshot.payload)
}

function storageFailureIsNotReportedAsSaved(): void {
  render(<ConditionComposerPanel {...buildProps()} />)
  fireEvent.click(screen.getByText('Saved setups & sharing'))
  vi.spyOn(storageMock, 'setItem').mockImplementation(() => {
    throw new Error('quota exceeded')
  })

  fireEvent.click(screen.getByRole('button', { name: 'Save new' }))

  expect(screen.getByRole('alert').textContent).toMatch(/storage may be unavailable or full/i)
  expect(screen.queryByText('Saved setup updated.')).toBeNull()
  expect(storageMap.has(PRESET_LIBRARY_STORAGE_KEY)).toBe(false)
}

describe('ui/ConditionComposerPanel shared preset hash', () => {
  it(
    'applies a shared preset hash only once without enabling audio and clears it after import',
    applySharedPresetHashOnce,
  )
})

describe('ui/ConditionComposerPanel preset storage migration', () => {
  it(
    'surfaces corrupt preset library storage without deleting it or treating it as clean empty state',
    assertCorruptPresetLibraryStorage,
  )

  it(
    'does not remove legacy storage or write v2 storage when legacy migration is invalid',
    assertInvalidLegacyMigrationIsPreserved,
  )

  it('retains legacy migration by converting valid legacy storage to v2 once', () =>
    assertValidLegacyMigrationIsRetained(storageMap, buildProps))
})

describe('ui/ConditionComposerPanel saved setup storage', () => {
  it(
    'allows an eight-second preset deletion to be undone without changing the payload',
    undoDeletedPresetKeepsPayload,
  )
  it(
    'surfaces storage write failure without claiming that a setup was saved',
    storageFailureIsNotReportedAsSaved,
  )
})
