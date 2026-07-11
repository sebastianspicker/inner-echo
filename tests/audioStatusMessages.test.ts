import { describe, expect, it } from 'vitest'

import { getAudioStateLabel } from '../src/ui/audioStatusMessages'

describe('ui/audioStatusMessages', () => {
  it('distinguishes engine-on audio from condition-level muted audio', () => {
    expect(getAudioStateLabel('on', true)).toBe('on')
    expect(getAudioStateLabel('on', false)).toBe('muted (engine on)')
  })

  it('keeps non-running audio states direct and user-readable', () => {
    expect(getAudioStateLabel('off', false)).toBe('off')
    expect(getAudioStateLabel('starting', false)).toBe('starting\u2026')
    expect(getAudioStateLabel('error', false)).toBe('error')
  })
})
