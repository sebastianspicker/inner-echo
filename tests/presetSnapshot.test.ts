import { describe, expect, test } from 'vitest'
import {
  DEFAULT_PRESET_NAME,
  LEGACY_PRESET_STORAGE_KEY,
  PRESET_LIBRARY_STORAGE_KEY,
  createPresetSnapshot,
  decodePresetPayload,
  encodePresetPayload,
  migrateLegacyPresetPayload,
  parsePresetLibrary,
  type PresetPayload,
} from '../src/ui/presetSnapshot'

function makePayload(overrides: Partial<PresetPayload> = {}): PresetPayload {
  return {
    mode: 'preset',
    conditionId: 'anxiety',
    presets: [{ profileId: 'anxiety', weight: 1 }],
    dimensions: [],
    intensity: 0.4,
    safeMode: true,
    reducedMotion: false,
    audioEnabled: false,
    couplingStrength: 0.5,
    maxFeedback: 0.35,
    interactionAmount: 0.15,
    ...overrides,
  }
}

describe('presetSnapshot', () => {
  test('encodes and decodes payload', () => {
    const payload = makePayload()
    const encoded = encodePresetPayload(payload)
    const decoded = decodePresetPayload(encoded)
    expect(decoded).toEqual(payload)
  })

  test('creates v2 snapshot with defaults', () => {
    const snap = createPresetSnapshot(makePayload(), {})
    expect(snap.version).toBe(2)
    expect(snap.name).toBe(DEFAULT_PRESET_NAME)
    expect(typeof snap.createdAt).toBe('string')
  })

  test('parses valid preset library and ignores invalid items', () => {
    const valid = createPresetSnapshot(makePayload(), { name: 'A' })
    const parsed = parsePresetLibrary(JSON.stringify([valid, { broken: true }]))
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.name).toBe('A')
  })

  test('migrates legacy payload shape', () => {
    const legacy = {
      mode: 'symptom',
      conditionId: 'none',
      dimensions: [{ dimensionId: 'intrusion', weight: 0.7 }],
      intensity: 0.6,
      safeMode: false,
      reducedMotion: true,
      audioEnabled: true,
      couplingStrength: 0.8,
      maxFeedback: 0.4,
      interactionAmount: 0.2,
    }
    const migrated = migrateLegacyPresetPayload(legacy)
    expect(migrated?.mode).toBe('symptom')
    expect(migrated?.dimensions).toHaveLength(1)
  })

  test('exports storage keys for interoperability', () => {
    expect(PRESET_LIBRARY_STORAGE_KEY).toBe('ie_custom_presets_v2')
    expect(LEGACY_PRESET_STORAGE_KEY).toBe('ie_custom_preset')
  })
})
