import { describe, expect, it, vi } from 'vitest'

import type { Profile } from '../../src/conditions/schema'
import type { AudioEngineControl } from '../../src/engine/audio'
import { syncConditionAudio } from '../../src/ui/cameraRuntime'

function makeAudioControl(): AudioEngineControl {
  return {
    applyReactiveParams: vi.fn(),
    getDebugState: vi.fn(),
    getMetrics: vi.fn(),
    getRms: vi.fn(),
    requestMic: vi.fn(),
    setConditionAudio: vi.fn(),
    setInputMode: vi.fn(),
    setMasterVolume: vi.fn(),
    setMicGate: vi.fn(),
    setMicSensitivity: vi.fn(),
    stop: vi.fn(),
    stopMic: vi.fn(),
  }
}

describe('ui/cameraRuntime condition audio synchronization', () => {
  it('keeps an explicitly enabled runtime audible while a composed profile is still disabled', () => {
    const control = makeAudioControl()
    const setMasterVolume = vi.fn()
    const audioStack = {
      enabled: false,
      master: { volume: 0.18 },
      chain: [{ node: 'noise_bed', params: { level: 0.02 } }],
    }
    const profile = { id: 'composed', audio_stack: audioStack } as Profile

    syncConditionAudio(control, 'on', true, profile, setMasterVolume)

    expect(control.setConditionAudio).toHaveBeenCalledWith({ ...audioStack, enabled: true })
    expect(control.setMasterVolume).toHaveBeenCalledWith(0.18)
    expect(setMasterVolume).toHaveBeenCalledWith(0.18)
    expect(profile.audio_stack?.enabled).toBe(false)
  })
})
