import { describe, expect, it } from 'vitest'

import {
  decodePresetFromHash,
  encodePresetToHash,
  migrateLegacyPresetPayload,
  type PresetPayload,
} from '../../src/app/experience/presets/format'
import {
  settingsFromPayload,
  type ExperienceSettings,
} from '../../src/app/experience/workspace/settings'

const baselineSettings: ExperienceSettings = {
  composerMode: 'preset',
  conditionId: 'none',
  presets: [],
  dimensions: [],
  intensity: 0.5,
  safeMode: true,
  reducedMotion: false,
  stressMode: false,
  couplingStrength: 0,
  maxFeedback: 0.35,
  interactionAmount: 0.15,
}

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
  it('keeps unspecified legacy coupling off and preserves an explicit saved value', () => {
    expect(migrateLegacyPresetPayload({})?.couplingStrength).toBe(0)
    expect(migrateLegacyPresetPayload({ couplingStrength: 0.3 })?.couplingStrength).toBe(0.3)
  })
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

  it('applies a stored payload onto settings in one call', () => {
    // Forcing sound off for a passive application is the session's job, composed by the
    // caller alongside settings.apply; see workspace-workflows.test.ts "loading a saved
    // preset while sound is on stops sound".
    const next = settingsFromPayload(payload, baselineSettings)

    expect(next.composerMode).toBe(payload.mode)
    expect(next.conditionId).toBe(payload.conditionId)
    expect(next.presets).toEqual(payload.presets)
    expect(next.dimensions).toEqual(payload.dimensions)
    expect(next.intensity).toBe(payload.intensity)
  })
})
