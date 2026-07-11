import { describe, expect, it } from 'vitest'

import { getCameraStateLabel } from '../src/ui/cameraMessages'

describe('ui/cameraMessages', () => {
  it('labels camera failure separately from idle, requesting, active, and denied states', () => {
    expect(getCameraStateLabel('idle')).toBe('Ready')
    expect(getCameraStateLabel('requesting')).toBe('Requesting access\u2026')
    expect(getCameraStateLabel('active')).toBe('Active')
    expect(getCameraStateLabel('denied')).toBe('Permission needed')
    expect(getCameraStateLabel('error')).toBe('Camera error')
    expect(getCameraStateLabel('error')).not.toBe('Paused')
  })
})
