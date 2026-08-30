import { describe, expect, it, vi } from 'vitest'

import { migrateLegacyPresetPayload } from '../../src/app/experience/presets/library'
import type { PresetPayload } from '../../src/app/experience/presets/payloadCodec'
import {
  decodePresetFromHash,
  encodePresetToHash,
} from '../../src/app/experience/presets/presetShare'
import { applyPassivePresetConfiguration } from '../../src/app/experience/presets/usePresetLibrary'

const payload: PresetPayload = {
  mode: 'symptom',
  conditionId: 'focus',
  presets: [{ profileId: 'calm', weight: 0.5 }],
  dimensions: [{ dimensionId: 'focus', weight: 0.75 }],
  intensity: 0.4,
  safeMode: true,
  reducedMotion: false,
  audioEnabled: true,
  couplingStrength: 0.3,
  maxFeedback: 0.2,
  interactionAmount: 0.1,
}

describe('preset application contracts', () => {
  it('round-trips a bounded hash payload and rejects oversized input', () => {
    expect(decodePresetFromHash(encodePresetToHash(payload))).toEqual({ ok: true, payload })
    expect(decodePresetFromHash(`#preset=${'x'.repeat(8192)}`)).toEqual({
      ok: false,
      reason: 'payload-too-large',
    })
  })

  it('migrates legacy persisted configuration as data without browser media APIs', () => {
    const migrated = migrateLegacyPresetPayload({
      conditionId: 'legacy_focus',
      presets: [{ profileId: 'calm', weight: 2 }],
      intensity: 2,
      audioEnabled: true,
      couplingStrength: -1,
      maxFeedback: 3,
    })

    expect(migrated).toMatchObject({
      mode: 'preset',
      conditionId: 'legacy_focus',
      intensity: 1,
      safeMode: true,
      audioEnabled: true,
      couplingStrength: 0,
      maxFeedback: 1,
    })
    expect(migrated?.presets).toEqual([{ profileId: 'calm', weight: 1 }])
  })

  it('applies stored configuration passively with audio forced off', () => {
    const callbacks = {
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

    applyPassivePresetConfiguration(payload, callbacks)

    expect(callbacks.onAudioEnabledChange).toHaveBeenCalledExactlyOnceWith(false)
    expect(callbacks.onModeChange).toHaveBeenCalledExactlyOnceWith(payload.mode)
    expect(callbacks.onConditionIdChange).toHaveBeenCalledExactlyOnceWith(payload.conditionId)
  })
})
