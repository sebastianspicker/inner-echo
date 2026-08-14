// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Profile } from '../../src/conditions/schema'

const startAudioContextMock = vi.hoisted(() => vi.fn())
const closeAudioContextMock = vi.hoisted(() => vi.fn())
const createAudioEngineMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/engine/audio', () => ({
  closeAudioContext: closeAudioContextMock,
  createAudioEngine: createAudioEngineMock,
  startAudioContext: startAudioContextMock,
}))

import { useAudioRuntime } from '../../src/ui/hooks/useAudioRuntime'

function makeAudioControl() {
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

afterEach(() => {
  cleanup()
  startAudioContextMock.mockReset()
  closeAudioContextMock.mockReset()
  createAudioEngineMock.mockReset()
})

describe('ui/hooks/useAudioRuntime', () => {
  it('turns a disabled composed stack on from the dedicated audio action', async () => {
    const control = makeAudioControl()
    startAudioContextMock.mockResolvedValue('on')
    createAudioEngineMock.mockReturnValue(control)
    const audioStack = {
      enabled: false,
      master: { volume: 0.18 },
      chain: [{ node: 'noise_bed', params: { level: 0.02 } }],
    }
    const profileRef = {
      current: {
        id: 'composed',
        audio_stack: audioStack,
      } as Profile,
    }
    const { result } = renderHook(() => useAudioRuntime({ profileRef }))

    act(() => result.current.handleEnableAudio())

    await waitFor(() => expect(result.current.audioStatus).toBe('on'))
    expect(result.current.audioEnabled).toBe(true)
    expect(createAudioEngineMock).toHaveBeenCalledWith(
      { ...audioStack, enabled: true },
      expect.any(Object),
    )
    expect(control.setMasterVolume).toHaveBeenCalledWith(0.18)
    expect(result.current.masterVolume).toBe(0.18)
    expect(profileRef.current.audio_stack?.enabled).toBe(false)
  })
})
