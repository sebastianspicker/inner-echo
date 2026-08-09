// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import type { CameraRuntimeContext } from '../../src/ui/cameraRuntime'

const cameraRuntime = vi.hoisted(() => ({
  releaseCameraRuntime: vi.fn(),
  startCameraRuntime: vi.fn(),
  startRmsMeter: vi.fn(),
  stopCameraRuntime: vi.fn(),
  syncConditionAudio: vi.fn(),
}))

const audioRuntime = vi.hoisted(() => ({
  audioEngineControlRef: { current: null },
  audioRequestSeqRef: { current: 0 },
  audioEnabled: false,
  audioError: null,
  audioStatus: 'off' as const,
  handleAudioEnabledChange: vi.fn(),
  handleDisableAudio: vi.fn(),
  handleDisableMic: vi.fn(),
  handleEnableAudio: vi.fn(),
  handleEnableMic: vi.fn(),
  handleInputModeChange: vi.fn(),
  handleMasterVolumeChange: vi.fn(),
  handleMicGateChange: vi.fn(),
  handleMicSensitivityChange: vi.fn(),
  inputMode: 'synth' as const,
  masterVolume: 0,
  micError: null,
  micGate: 0,
  micSensitivity: 1,
  micStatus: 'off' as const,
  setAudioError: vi.fn(),
  setAudioStatus: vi.fn(),
  setMasterVolume: vi.fn(),
  setMicError: vi.fn(),
  setMicStatus: vi.fn(),
}))

vi.mock('../../src/ui/cameraRuntime', () => cameraRuntime)
vi.mock('../../src/ui/hooks/useAudioRuntime', () => ({
  useAudioRuntime: () => audioRuntime,
}))
vi.mock('../../src/ui/hooks/useCatalog', () => ({
  useCatalog: () => ({ catalog: [], status: 'ready', error: null, retry: vi.fn() }),
}))
vi.mock('../../src/ui/hooks/useProfileLoad', () => ({
  useProfileLoad: () => ({
    composeReport: null,
    controlValues: {},
    isProfileLoading: false,
    profile: null,
    profileLoadError: null,
    profileLoadStatus: 'idle',
    retryProfileLoad: vi.fn(),
    setControlValues: vi.fn(),
  }),
}))
vi.mock('../../src/ui/hooks/useOverlayController', () => ({
  useOverlayController: () => ({
    getAppliedClamps: vi.fn(),
    getAudioDebugState: vi.fn(),
    getOverlayDiagnostics: vi.fn(),
  }),
}))
vi.mock('../../src/ui/hooks/useReactivePipeline', () => ({ useReactivePipeline: vi.fn() }))
vi.mock('../../src/ui/cameraViewSupport', () => ({
  CAMERA_STREAM_INTERRUPTED_MESSAGE: 'Camera stream interrupted.',
  handleCameraStreamInterruption: vi.fn(),
  monitorCameraStream: vi.fn(),
  subscribeToCameraDeviceChanges: vi.fn(),
}))
vi.mock('../../src/ui/CameraHeader', () => ({
  CameraHeader: ({ onStop }: { onStop: () => void }) => (
    <header>
      <button type="button" onClick={onStop}>
        Stop Everything
      </button>
    </header>
  ),
}))
vi.mock('../../src/ui/CameraStage', () => ({ CameraStage: () => <div /> }))
vi.mock('../../src/ui/AudioMicControls', () => ({ AudioMicControls: () => <div /> }))
vi.mock('../../src/ui/ConditionComposerPanel', () => ({ ConditionComposerPanel: () => <div /> }))
vi.mock('../../src/ui/DebugPanel', () => ({ DebugPanel: () => <div /> }))
vi.mock('../../src/ui/EffectControls', () => ({ EffectControls: () => <div /> }))
vi.mock('../../src/ui/RuntimeRail', () => ({ RuntimeRail: () => <div /> }))
vi.mock('../../src/ui/SafetyControls', () => ({
  SafetyControls: ({ onStart, onStop }: { onStart: () => void; onStop: () => void }) => (
    <div>
      <button type="button" onClick={onStart}>
        Start camera
      </button>
      <button type="button" onClick={onStop}>
        Stop camera
      </button>
    </div>
  ),
}))

import { CameraView } from '../../src/ui/CameraView'

const WELCOME_ACKNOWLEDGEMENT_KEY = 'inner-echo-welcome-acknowledged-v2'
const storageMap = new Map<string, string>()
const storageMock: Storage = {
  get length() {
    return storageMap.size
  },
  clear: () => storageMap.clear(),
  getItem: (key) => storageMap.get(key) ?? null,
  key: (index) => [...storageMap.keys()][index] ?? null,
  removeItem: (key) => storageMap.delete(key),
  setItem: (key, value) => storageMap.set(key, value),
}

beforeEach(() => {
  storageMap.clear()
  storageMap.set(WELCOME_ACKNOWLEDGEMENT_KEY, 'true')
  vi.stubGlobal('localStorage', storageMock)
  Object.values(cameraRuntime).forEach((mock) => mock.mockReset())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ui/CameraView camera lifecycle', () => {
  it('starts the camera from the user control and stops it from the header control', async () => {
    cameraRuntime.startCameraRuntime.mockImplementation(async (context: CameraRuntimeContext) => {
      context.setCameraState('active')
    })
    cameraRuntime.stopCameraRuntime.mockImplementation((context: CameraRuntimeContext) => {
      context.setCameraState('idle')
    })

    render(<CameraView />)

    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    await waitFor(() => expect(cameraRuntime.startCameraRuntime).toHaveBeenCalledOnce())
    expect(screen.getByText(/Camera active\. Effects/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Stop Everything' }))

    await waitFor(() => expect(cameraRuntime.stopCameraRuntime).toHaveBeenCalledOnce())
    expect(screen.getByText(/Camera idle\. Effects/)).toBeInTheDocument()
  })

  it('shows a camera notice when startup reports an interrupted stream', async () => {
    cameraRuntime.startCameraRuntime.mockImplementation(async (context: CameraRuntimeContext) => {
      context.setCameraState('error')
      context.setErrorMessage('Camera stream interrupted. Please reconnect it and try again.')
    })

    render(<CameraView />)

    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: 'Camera notice' })).toHaveTextContent(
        'Camera stream interrupted. Please reconnect it and try again.',
      )
    })
  })
})
