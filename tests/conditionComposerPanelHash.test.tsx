// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import {
  ConditionComposerPanel,
  type ConditionComposerPanelProps,
} from '../src/ui/ConditionComposerPanel'
import { encodePresetToHash } from '../src/ui/presetShare'
import type { PresetPayload } from '../src/ui/presetSnapshot'

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
    onMicEnabledChange: ReturnType<typeof vi.fn>
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
    onMicEnabledChange: vi.fn(),
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
    micEnabled: false,
    onMicEnabledChange: spies.onMicEnabledChange,
    micRequiresAudio: true,
    micRequiresAudioHint: 'Enable audio first.',
    couplingStrength: 0.5,
    onCouplingStrengthChange: spies.onCouplingStrengthChange,
    maxFeedback: 0.35,
    onMaxFeedbackChange: spies.onMaxFeedbackChange,
    interactionAmount: 0.15,
    onInteractionAmountChange: spies.onInteractionAmountChange,
    debugOverlay: false,
    onDebugOverlayChange: vi.fn(),
    onQuickPreset: vi.fn(),
    onOpenEvidence: vi.fn(),
    __spies: spies,
    ...overrides,
  }
}

describe('ui/ConditionComposerPanel shared preset hash', () => {
  beforeEach(() => {
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

  it('applies a shared preset hash only once without enabling audio and clears it after import', async () => {
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

    await waitFor(() => {
      expect(props.__spies.onModeChange).toHaveBeenCalledTimes(1)
    })
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
  })
})
