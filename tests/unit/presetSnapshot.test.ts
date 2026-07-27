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
  parsePresetLibraryWithDiagnostics,
  applyPresetPayload,
  type PresetPayload,
  type ApplyPresetPayloadCallbacks,
} from '../../src/ui/presetSnapshot'

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

  describe('parsePresetLibrary edge cases', () => {
    test('corrupted JSON returns empty array', () => {
      const result = parsePresetLibrary('not valid json {{{')
      expect(result).toEqual([])
    })

    test('corrupted JSON returns diagnostics without deleting or fabricating presets', () => {
      const result = parsePresetLibraryWithDiagnostics('not valid json {{{')
      expect(result.snapshots).toEqual([])
      expect(result.diagnostics).toEqual({
        ok: false,
        reason: 'invalid-json',
        totalItems: 0,
        invalidItems: 0,
      })
    })

    test('non-array JSON returns empty array', () => {
      const result = parsePresetLibrary('"just a string"')
      expect(result).toEqual([])
    })

    test('object JSON returns empty array', () => {
      const result = parsePresetLibrary('{"key": "value"}')
      expect(result).toEqual([])
    })

    test('partial/invalid entries are filtered out', () => {
      const valid = createPresetSnapshot(makePayload(), { name: 'Good' })
      const items = [
        valid,
        { version: 1, broken: true }, // wrong version
        { version: 2, id: 'x' }, // missing required fields
        null,
        42,
        'string',
      ]
      const result = parsePresetLibrary(JSON.stringify(items))
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Good')
    })

    test('partial/invalid entries report diagnostics while preserving valid snapshots', () => {
      const valid = createPresetSnapshot(makePayload(), { name: 'Good' })
      const result = parsePresetLibraryWithDiagnostics(
        JSON.stringify([valid, { version: 1, broken: true }]),
      )
      expect(result.snapshots).toHaveLength(1)
      expect(result.diagnostics).toEqual({
        ok: false,
        reason: 'invalid-items',
        totalItems: 2,
        invalidItems: 1,
      })
    })

    test('empty array JSON returns empty array', () => {
      const result = parsePresetLibrary('[]')
      expect(result).toEqual([])
    })
  })

  describe('migrateLegacyPresetPayload edge cases', () => {
    test('v1 format with minimal fields converts to full v2 payload', () => {
      const legacy = {
        conditionId: 'ptsd',
      }
      const migrated = migrateLegacyPresetPayload(legacy)
      expect(migrated).not.toBeNull()
      expect(migrated!.mode).toBe('preset')
      expect(migrated!.conditionId).toBe('ptsd')
      expect(migrated!.presets).toEqual([])
      expect(migrated!.dimensions).toEqual([])
      expect(migrated!.intensity).toBe(0.5)
      expect(migrated!.safeMode).toBe(true)
      expect(migrated!.reducedMotion).toBe(false)
      expect(migrated!.audioEnabled).toBe(false)
      expect(migrated!.couplingStrength).toBe(0.5)
      expect(migrated!.maxFeedback).toBe(0.35)
      expect(migrated!.interactionAmount).toBe(0.15)
    })

    test('completely empty object converts with all defaults', () => {
      const migrated = migrateLegacyPresetPayload({})
      expect(migrated).not.toBeNull()
      expect(migrated!.mode).toBe('preset')
      expect(migrated!.conditionId).toBe('none')
    })

    test('null input returns null', () => {
      const migrated = migrateLegacyPresetPayload(null)
      expect(migrated).toBeNull()
    })

    test('non-object input returns null', () => {
      expect(migrateLegacyPresetPayload('string')).toBeNull()
      expect(migrateLegacyPresetPayload(42)).toBeNull()
    })

    test('preserves presets and dimensions from legacy format', () => {
      const legacy = {
        presets: [{ profileId: 'anxiety', weight: 0.8 }],
        dimensions: [{ dimensionId: 'intrusion', weight: 0.6 }],
      }
      const migrated = migrateLegacyPresetPayload(legacy)
      expect(migrated!.presets).toHaveLength(1)
      expect(migrated!.presets[0].profileId).toBe('anxiety')
      expect(migrated!.dimensions).toHaveLength(1)
      expect(migrated!.dimensions[0].dimensionId).toBe('intrusion')
    })

    test('rejects legacy identifiers that cannot be written as valid v2 payload', () => {
      const migrated = migrateLegacyPresetPayload({
        conditionId: 'bad id with spaces',
        presets: [{ profileId: 'anxiety', weight: 0.8 }],
      })
      expect(migrated).toBeNull()
    })
  })

  describe('decodePresetPayload edge cases', () => {
    test('truncated JSON returns null', () => {
      const result = decodePresetPayload('{"mode":"pres')
      expect(result).toBeNull()
    })

    test('valid JSON but wrong schema returns null', () => {
      const result = decodePresetPayload('{"wrong": "shape"}')
      expect(result).toBeNull()
    })

    test('empty string returns null', () => {
      const result = decodePresetPayload('')
      expect(result).toBeNull()
    })
  })

  describe('createPresetSnapshot edge cases', () => {
    test('includes timestamp and mode in snapshot', () => {
      const payload = makePayload({ mode: 'symptom' })
      const snap = createPresetSnapshot(payload, {
        createdAt: '2024-01-01T00:00:00.000Z',
      })
      expect(snap.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(snap.payload.mode).toBe('symptom')
      expect(snap.version).toBe(2)
    })

    test('uses custom name and id when provided', () => {
      const snap = createPresetSnapshot(makePayload(), {
        name: 'Custom Name',
        id: 'custom-id',
      })
      expect(snap.name).toBe('Custom Name')
      expect(snap.id).toBe('custom-id')
    })

    test('trims whitespace from name, defaults empty to DEFAULT_PRESET_NAME', () => {
      const snap = createPresetSnapshot(makePayload(), { name: '   ' })
      expect(snap.name).toBe(DEFAULT_PRESET_NAME)
    })
  })

  describe('round-trip: create → encode → decode → verify', () => {
    test('all fields survive a full round-trip', () => {
      const original = makePayload({
        mode: 'multimorbid',
        conditionId: 'custom',
        presets: [
          { profileId: 'anxiety', weight: 0.7 },
          { profileId: 'dpdr', weight: 0.3 },
        ],
        dimensions: [{ dimensionId: 'intrusion', weight: 0.5 }],
        intensity: 0.6,
        safeMode: true,
        reducedMotion: true,
        audioEnabled: true,
        couplingStrength: 0.8,
        maxFeedback: 0.4,
        interactionAmount: 0.25,
      })

      const encoded = encodePresetPayload(original)
      const decoded = decodePresetPayload(encoded)

      expect(decoded).not.toBeNull()
      expect(decoded!.mode).toBe('multimorbid')
      expect(decoded!.conditionId).toBe('custom')
      expect(decoded!.presets).toHaveLength(2)
      // presets are sorted by profileId
      expect(decoded!.presets[0].profileId).toBe('anxiety')
      expect(decoded!.presets[1].profileId).toBe('dpdr')
      expect(decoded!.presets[0].weight).toBeCloseTo(0.7)
      expect(decoded!.dimensions).toHaveLength(1)
      expect(decoded!.dimensions[0].dimensionId).toBe('intrusion')
      expect(decoded!.intensity).toBeCloseTo(0.6)
      expect(decoded!.safeMode).toBe(true)
      expect(decoded!.reducedMotion).toBe(true)
      expect(decoded!.audioEnabled).toBe(true)
      expect(decoded!.couplingStrength).toBeCloseTo(0.8)
      expect(decoded!.maxFeedback).toBeCloseTo(0.4)
      expect(decoded!.interactionAmount).toBeCloseTo(0.25)
    })
  })

  describe('applyPresetPayload', () => {
    test('calls all callbacks with correct values', () => {
      const payload = makePayload({
        mode: 'symptom',
        conditionId: 'test-id',
        intensity: 0.7,
        safeMode: true,
        reducedMotion: true,
        audioEnabled: true,
        couplingStrength: 0.6,
        maxFeedback: 0.3,
        interactionAmount: 0.2,
      })

      const calls: Record<string, unknown> = {}
      const callbacks: ApplyPresetPayloadCallbacks = {
        onModeChange: (v) => {
          calls.mode = v
        },
        onConditionIdChange: (v) => {
          calls.conditionId = v
        },
        onPresetsChange: (v) => {
          calls.presets = v
        },
        onDimensionsChange: (v) => {
          calls.dimensions = v
        },
        onIntensityChange: (v) => {
          calls.intensity = v
        },
        onSafeModeChange: (v) => {
          calls.safeMode = v
        },
        onReducedMotionChange: (v) => {
          calls.reducedMotion = v
        },
        onAudioEnabledChange: (v) => {
          calls.audioEnabled = v
        },
        onCouplingStrengthChange: (v) => {
          calls.couplingStrength = v
        },
        onMaxFeedbackChange: (v) => {
          calls.maxFeedback = v
        },
        onInteractionAmountChange: (v) => {
          calls.interactionAmount = v
        },
      }

      applyPresetPayload(payload, callbacks)

      expect(calls.mode).toBe('symptom')
      expect(calls.conditionId).toBe('test-id')
      expect(calls.presets).toEqual(payload.presets)
      expect(calls.dimensions).toEqual(payload.dimensions)
      expect(calls.intensity).toBeCloseTo(0.7)
      expect(calls.safeMode).toBe(true)
      expect(calls.reducedMotion).toBe(true)
      expect(calls.audioEnabled).toBe(true)
      expect(calls.couplingStrength).toBeCloseTo(0.6)
      expect(calls.maxFeedback).toBeCloseTo(0.3)
      expect(calls.interactionAmount).toBeCloseTo(0.2)
    })
  })
})
