// @vitest-environment jsdom
//
// Pins the storage keys and #preset= hash grammar the app actually reads and writes
// (docs/ARCHITECTURE.md "Preserve ... the #preset= grammar and legacy preset migration").
import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import {
  LEGACY_PRESET_STORAGE_KEY,
  PRESET_LIBRARY_STORAGE_KEY,
  migrateLegacyPresetPayload,
} from '../../src/app/experience/presets/library'
import type { ApplyPresetPayloadCallbacks } from '../../src/app/experience/presets/payloadCodec'
import { usePresetLibrary } from '../../src/app/experience/presets/usePresetLibrary'
import {
  LEGACY_WELCOME_ACKNOWLEDGEMENT_KEY,
  WELCOME_ACKNOWLEDGEMENT_KEY,
} from '../../src/app/experience/components/WelcomeStep'
import {
  decodePresetFromHash,
  encodePresetToHash,
} from '../../src/app/experience/presets/presetShare'
import { disposeTestRoot, enableReactActEnvironment, renderTestRoot } from './reactDomHarness'

enableReactActEnvironment()
let root: Root | null = null

afterEach(async () => {
  await disposeTestRoot(root)
  root = null
  localStorage.clear()
})

const PAYLOAD_CALLBACK_KEYS = [
  'onModeChange',
  'onConditionIdChange',
  'onPresetsChange',
  'onDimensionsChange',
  'onIntensityChange',
  'onSafeModeChange',
  'onReducedMotionChange',
  'onAudioEnabledChange',
  'onCouplingStrengthChange',
  'onMaxFeedbackChange',
  'onInteractionAmountChange',
] as const

/** Builds a no-op ApplyPresetPayloadCallbacks: only localStorage writes matter here. */
function createNoopPayloadCallbacks(): ApplyPresetPayloadCallbacks {
  const noop = () => {}
  const entries = PAYLOAD_CALLBACK_KEYS.map((key) => [key, noop])
  return Object.fromEntries(entries) as ApplyPresetPayloadCallbacks
}

describe('storage key literals', () => {
  it('pins the exported preset and welcome storage key literals', () => {
    expect(PRESET_LIBRARY_STORAGE_KEY).toBe('ie_custom_presets_v2')
    expect(LEGACY_PRESET_STORAGE_KEY).toBe('ie_custom_preset')
    expect(WELCOME_ACKNOWLEDGEMENT_KEY).toBe('inner-echo-welcome-acknowledged-v2')
    expect(LEGACY_WELCOME_ACKNOWLEDGEMENT_KEY).toBe('inner-echo-onboarding-accepted')
  })

  it('writes a saved preset under the literal ie_custom_presets_v2 key', async () => {
    const migrated = migrateLegacyPresetPayload({ conditionId: 'none' })
    if (!migrated) throw new Error('expected a valid default preset payload')
    const currentPayload = migrated
    const payloadCallbacks = createNoopPayloadCallbacks()
    let library: ReturnType<typeof usePresetLibrary> | undefined
    function Probe() {
      library = usePresetLibrary({ currentPayload, payloadCallbacks })
      return null
    }
    const rendered = await renderTestRoot(createElement(Probe))
    root = rendered.root

    expect(localStorage.getItem('ie_custom_presets_v2')).toBeNull()
    await act(async () => library?.onSave())

    expect(localStorage.getItem('ie_custom_presets_v2')).not.toBeNull()
  })
})

describe('preset hash grammar', () => {
  const payload = {
    mode: 'preset' as const,
    conditionId: 'anxiety',
    presets: [],
    dimensions: [],
    intensity: 0.6,
    safeMode: true,
    reducedMotion: false,
    audioEnabled: false,
    couplingStrength: 0,
    maxFeedback: 0.35,
    interactionAmount: 0.15,
  }

  it('encodes with the literal #preset= prefix in unpadded base64url form', () => {
    const hash = encodePresetToHash(payload)
    expect(hash.startsWith('#preset=')).toBe(true)
    expect(hash.slice('#preset='.length)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('round-trips a valid hash and rejects a payload over the 8192-character limit', () => {
    const hash = encodePresetToHash(payload)
    const decoded = decodePresetFromHash(hash)
    expect(decoded).toEqual({ ok: true, payload })

    const oversized = `#preset=${'a'.repeat(8192)}`
    expect(decodePresetFromHash(oversized)).toEqual({ ok: false, reason: 'payload-too-large' })
  })

  it('rejects a hash missing the #preset= prefix', () => {
    expect(decodePresetFromHash('#other=abc')).toEqual({ ok: false, reason: 'missing-prefix' })
  })
})
