import { describe, expect, test } from 'vitest'
import { decodePresetFromHash, encodePresetToHash } from '../../src/ui/presetShare'
import type { PresetPayload } from '../../src/ui/presetSnapshot'

const payload: PresetPayload = {
  mode: 'multimorbid',
  conditionId: 'none',
  presets: [{ profileId: 'panic', weight: 0.6 }],
  dimensions: [],
  intensity: 0.5,
  safeMode: true,
  reducedMotion: false,
  audioEnabled: true,
  couplingStrength: 0.5,
  maxFeedback: 0.35,
  interactionAmount: 0.15,
}

describe('presetShare', () => {
  test('round-trips payload through hash codec', () => {
    const hash = encodePresetToHash(payload)
    const decoded = decodePresetFromHash(hash)
    expect(decoded.ok).toBe(true)
    expect(decoded.payload).toEqual(payload)
  })

  test('rejects invalid hash payloads safely', () => {
    const decoded = decodePresetFromHash('#preset=%%%')
    expect(decoded.ok).toBe(false)
  })

  test('rejects hash exceeding MAX_HASH_PAYLOAD_LENGTH', () => {
    const oversized = `#preset=${'A'.repeat(8200)}`
    const decoded = decodePresetFromHash(oversized)
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) {
      expect(decoded.reason).toBe('payload-too-large')
    }
  })
})
