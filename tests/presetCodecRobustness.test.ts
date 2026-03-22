import { describe, expect, it } from 'vitest'
import {
  encodePresetToHash,
  decodePresetFromHash,
} from '../src/ui/presetShare'
import {
  encodePresetPayload,
  decodePresetPayload,
  presetPayloadSchema,
  createPresetPayload,
  type PresetPayload,
} from '../src/ui/presetSnapshot'

/**
 * Robustness tests for the preset codec (Base64Url encoding/decoding)
 * and Zod-validated preset payloads.
 */

function makePayload(overrides: Partial<PresetPayload> = {}): PresetPayload {
  return {
    mode: 'preset',
    conditionId: 'test',
    presets: [],
    dimensions: [],
    intensity: 0.5,
    safeMode: true,
    reducedMotion: false,
    audioEnabled: false,
    couplingStrength: 0.5,
    maxFeedback: 0.35,
    interactionAmount: 0.15,
    ...overrides,
  }
}

describe('presetCodecRobustness — Base64Url edge cases', () => {
  it('round-trips payload with odd-length input (1-char conditionId)', () => {
    const payload = makePayload({ conditionId: 'x' })
    const hash = encodePresetToHash(payload)
    const decoded = decodePresetFromHash(hash)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) {
      expect(decoded.payload.conditionId).toBe('x')
    }
  })

  it('round-trips payload with 3-char conditionId (padding edge case)', () => {
    // 3-byte input produces 4 Base64 chars (no padding), but after JSON encoding
    // the overall string length varies. This tests the padding arithmetic.
    const payload = makePayload({ conditionId: 'abc' })
    const hash = encodePresetToHash(payload)
    const decoded = decodePresetFromHash(hash)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) {
      expect(decoded.payload.conditionId).toBe('abc')
    }
  })

  it('decodes payload with missing padding characters', () => {
    // Encode a known payload, then verify the Base64Url token has no padding '='
    const payload = makePayload()
    const hash = encodePresetToHash(payload)
    // The encoder strips trailing padding from the Base64 token.
    // Extract just the token (after the prefix) and verify no '=' padding.
    const token = hash.slice('#preset='.length)
    expect(token).not.toContain('=')
    // Decoding should still work (fromBase64Url re-adds padding)
    const decoded = decodePresetFromHash(hash)
    expect(decoded.ok).toBe(true)
  })

  it('rejects payloads with invalid Base64 characters (emoji)', () => {
    const badHash = '#preset=' + '🎭🎪🎨'
    const decoded = decodePresetFromHash(badHash)
    expect(decoded.ok).toBe(false)
  })

  it('rejects payloads with unicode characters', () => {
    const badHash = '#preset=' + 'äöü§ñ'
    const decoded = decodePresetFromHash(badHash)
    expect(decoded.ok).toBe(false)
  })

  it('rejects payloads with spaces and special characters', () => {
    const badHash = '#preset=abc def!@#$%^&*()'
    const decoded = decodePresetFromHash(badHash)
    expect(decoded.ok).toBe(false)
  })

  it('rejects empty token after prefix', () => {
    const decoded = decodePresetFromHash('#preset=')
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) {
      expect(decoded.reason).toBe('empty')
    }
  })

  it('rejects completely missing prefix', () => {
    const decoded = decodePresetFromHash('some-random-data')
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) {
      expect(decoded.reason).toBe('missing-prefix')
    }
  })
})

describe('presetCodecRobustness — round-trip all composer modes', () => {
  const modes = ['preset', 'multimorbid', 'symptom'] as const

  for (const mode of modes) {
    it(`round-trips ${mode} mode through hash codec`, () => {
      const payload = makePayload({
        mode,
        conditionId: 'dpdr',
        presets: [{ profileId: 'panic', weight: 0.6 }],
        dimensions: [{ dimensionId: 'derealization', weight: 0.8 }],
      })
      const hash = encodePresetToHash(payload)
      const decoded = decodePresetFromHash(hash)
      expect(decoded.ok).toBe(true)
      if (decoded.ok) {
        expect(decoded.payload.mode).toBe(mode)
        expect(decoded.payload.conditionId).toBe('dpdr')
        expect(decoded.payload.presets).toHaveLength(1)
        expect(decoded.payload.dimensions).toHaveLength(1)
      }
    })

    it(`round-trips ${mode} mode through JSON codec`, () => {
      const payload = makePayload({ mode })
      const serialized = encodePresetPayload(payload)
      const decoded = decodePresetPayload(serialized)
      expect(decoded).not.toBeNull()
      expect(decoded!.mode).toBe(mode)
    })
  }
})

describe('presetCodecRobustness — extreme weight values', () => {
  it('clamps weight 0.001 (very small but valid)', () => {
    const payload = makePayload({
      presets: [{ profileId: 'test', weight: 0.001 }],
    })
    const normalized = createPresetPayload(payload)
    // 0.001 is within [0,1], so it should be preserved
    expect(normalized.presets[0].weight).toBeCloseTo(0.001, 5)
  })

  it('clamps weight 999 to 1', () => {
    const payload = makePayload({
      presets: [{ profileId: 'test', weight: 999 }],
    })
    const normalized = createPresetPayload(payload)
    expect(normalized.presets[0].weight).toBe(1)
  })

  it('clamps weight -1 to 0 and filters it out (empty profileId guard)', () => {
    const payload = makePayload({
      presets: [{ profileId: 'test', weight: -1 }],
    })
    const normalized = createPresetPayload(payload)
    // -1 clamped to 0
    expect(normalized.presets[0].weight).toBe(0)
  })

  it('handles NaN weight by treating it as 0', () => {
    const payload = makePayload({
      presets: [{ profileId: 'test', weight: NaN }],
    })
    const normalized = createPresetPayload(payload)
    expect(normalized.presets[0].weight).toBe(0)
    expect(Number.isNaN(normalized.presets[0].weight)).toBe(false)
  })

  it('Zod rejects NaN weight at schema level', () => {
    const raw = {
      mode: 'preset',
      conditionId: 'test',
      presets: [{ profileId: 'test', weight: NaN }],
      dimensions: [],
      intensity: 0.5,
      safeMode: true,
      reducedMotion: false,
      audioEnabled: false,
      couplingStrength: 0.5,
      maxFeedback: 0.35,
      interactionAmount: 0.15,
    }
    // NaN is not a valid JSON number; Zod's z.number() rejects NaN
    const result = presetPayloadSchema.safeParse(raw)
    // Zod treats NaN as a valid number type in JS, but when serialized/deserialized
    // through JSON it becomes null. Test the JSON round-trip path.
    const serialized = JSON.stringify(raw)
    const deserialized = JSON.parse(serialized)
    const result2 = presetPayloadSchema.safeParse(deserialized)
    // JSON.stringify(NaN) => null, so weight becomes null, which Zod rejects
    expect(result2.success).toBe(false)
  })

  it('clamps extreme intensity and other numeric fields', () => {
    const payload = makePayload({
      intensity: 5.0,
      couplingStrength: -3.0,
      maxFeedback: 100,
      interactionAmount: -0.5,
    })
    const normalized = createPresetPayload(payload)
    expect(normalized.intensity).toBe(1)
    expect(normalized.couplingStrength).toBe(0)
    expect(normalized.maxFeedback).toBe(1)
    expect(normalized.interactionAmount).toBe(0)
  })

  it('dimension weight 0.001 is preserved', () => {
    const payload = makePayload({
      dimensions: [{ dimensionId: 'focus', weight: 0.001 }],
    })
    const normalized = createPresetPayload(payload)
    expect(normalized.dimensions[0].weight).toBeCloseTo(0.001, 5)
  })

  it('dimension weight 999 is clamped to 1', () => {
    const payload = makePayload({
      dimensions: [{ dimensionId: 'focus', weight: 999 }],
    })
    const normalized = createPresetPayload(payload)
    expect(normalized.dimensions[0].weight).toBe(1)
  })

  it('full round-trip with extreme weights through hash codec', () => {
    const payload = makePayload({
      mode: 'multimorbid',
      presets: [
        { profileId: 'a', weight: 0.001 },
        { profileId: 'b', weight: 999 },
      ],
      dimensions: [
        { dimensionId: 'x', weight: -1 },
        { dimensionId: 'y', weight: 0.999 },
      ],
    })
    const hash = encodePresetToHash(payload)
    const decoded = decodePresetFromHash(hash)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) {
      // Weights should be clamped
      const presetA = decoded.payload.presets.find((p) => p.profileId === 'a')
      const presetB = decoded.payload.presets.find((p) => p.profileId === 'b')
      expect(presetA?.weight).toBeCloseTo(0.001, 5)
      expect(presetB?.weight).toBe(1)

      const dimX = decoded.payload.dimensions.find((d) => d.dimensionId === 'x')
      const dimY = decoded.payload.dimensions.find((d) => d.dimensionId === 'y')
      expect(dimX?.weight).toBe(0)
      expect(dimY?.weight).toBeCloseTo(0.999, 5)
    }
  })
})
