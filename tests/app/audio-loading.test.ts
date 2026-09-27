// @vitest-environment jsdom

import { act, createElement, useRef } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { disposeTestRoot, enableReactActEnvironment, renderTestRoot } from './reactDomHarness'

const audioRuntime = vi.hoisted(() => ({
  startAudioContext: vi.fn(),
  closeAudioContext: vi.fn(),
  loadAudioEngine: vi.fn(),
}))

vi.mock('../../src/runtime/audio/control', () => audioRuntime)

import { useAudioRuntime } from '../../src/app/experience/session/useAudioRuntime'
import { pageRecovery } from '../../src/app/ErrorBoundary'
import { stopCameraRuntime } from '../../src/app/experience/session/cameraRuntime'
import {
  AudioMicControls,
  type AudioMicControlsProps,
} from '../../src/app/experience/components/AudioMicControls'

type AudioRuntime = ReturnType<typeof useAudioRuntime>

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function createControl() {
  return {
    stop: vi.fn(),
    requestMic: vi.fn(),
    stopMic: vi.fn(),
    setConditionAudio: vi.fn(),
    setMasterVolume: vi.fn(),
    setInputMode: vi.fn(),
    setMicSensitivity: vi.fn(),
    setMicGate: vi.fn(),
    applyReactiveParams: vi.fn(),
    getRms: vi.fn(() => 0),
    getMetrics: vi.fn(() => ({ rms: 0, centroid: 0, flux: 0 })),
    getDebugState: vi.fn(),
  }
}

type TestAudioEngineFactory = () => ReturnType<typeof createControl>

const pendingImportCancellationCases: {
  name: string
  enable: (runtime: AudioRuntime) => void
  cancel: (runtime: AudioRuntime) => void
}[] = [
  {
    name: 'discards a late engine import after direct disable',
    enable: (runtime) => runtime.handleEnableAudio(),
    cancel: (runtime) => runtime.handleDisableAudio(),
  },
  {
    name: 'discards a late engine import after the audio toggle is switched off',
    enable: (runtime) => runtime.handleAudioEnabledChange(true),
    cancel: (runtime) => runtime.handleAudioEnabledChange(false),
  },
]

let current: AudioRuntime | null = null
let root: Root | null = null

function AudioProbe() {
  const profileRef = useRef(null)
  current = useAudioRuntime({ profileRef })
  return createElement('span', null, current.audioStatus)
}

async function renderProbe() {
  const rendered = await renderTestRoot(createElement(AudioProbe))
  root = rendered.root
  return rendered.container
}

enableReactActEnvironment()

beforeEach(() => {
  audioRuntime.startAudioContext.mockReset()
  audioRuntime.closeAudioContext.mockReset().mockResolvedValue(undefined)
  audioRuntime.loadAudioEngine.mockReset()
  current = null
})

afterEach(async () => {
  await disposeTestRoot(root)
  root = null
  current = null
})

describe('deferred audio engine loading', () => {
  it('starts the AudioContext in the action before requesting the engine module', async () => {
    const contextStart = deferred<'on'>()
    audioRuntime.startAudioContext.mockReturnValue(contextStart.promise)
    await renderProbe()

    act(() => current?.handleEnableAudio())

    expect(audioRuntime.startAudioContext).toHaveBeenCalledOnce()
    expect(audioRuntime.loadAudioEngine).not.toHaveBeenCalled()
    expect(current?.audioStatus).toBe('starting')

    const control = createControl()
    const createEngine = vi.fn(() => control)
    audioRuntime.loadAudioEngine.mockResolvedValue(createEngine)
    await act(async () => contextStart.resolve('on'))

    expect(createEngine).toHaveBeenCalledOnce()
    expect(current?.audioStatus).toBe('on')
  })

  it.each(pendingImportCancellationCases)('$name', async ({ enable, cancel }) => {
    const engineImport = deferred<TestAudioEngineFactory>()
    audioRuntime.startAudioContext.mockResolvedValue('on')
    audioRuntime.loadAudioEngine.mockReturnValue(engineImport.promise)
    await renderProbe()

    await act(async () => enable(current as AudioRuntime))
    act(() => cancel(current as AudioRuntime))
    const createEngine = vi.fn(() => createControl())
    await act(async () => engineImport.resolve(createEngine))

    expect(createEngine).not.toHaveBeenCalled()
    expect(audioRuntime.closeAudioContext).toHaveBeenCalled()
    expect(current?.audioStatus).toBe('off')
    expect(current?.audioEnabled).toBe(false)
  })
})

describe('audio start cancellation and active-engine ordering', () => {
  it('invalidates a delayed context start when Stop Everything wins the race', async () => {
    const contextStart = deferred<'on'>()
    audioRuntime.startAudioContext.mockReturnValue(contextStart.promise)
    await renderProbe()
    act(() => current?.handleEnableAudio())

    act(() => {
      const runtime = current as AudioRuntime
      stopCameraRuntime({
        streamRef: { current: null },
        videoRef: { current: null },
        canvasRef: { current: null },
        fallbackCanvasRef: { current: null },
        overlayControlRef: { current: null },
        audioEngineControlRef: runtime.audioEngineControlRef,
        cameraRequestSeqRef: { current: 0 },
        audioRequestSeqRef: runtime.audioRequestSeqRef,
        setCameraState: vi.fn(),
        setErrorMessage: vi.fn(),
        setAudioStatus: runtime.setAudioStatus,
        setAudioError: runtime.setAudioError,
        setMicStatus: runtime.setMicStatus,
        setMicError: runtime.setMicError,
      })
    })
    await act(async () => contextStart.resolve('on'))

    expect(audioRuntime.loadAudioEngine).not.toHaveBeenCalled()
    expect(audioRuntime.closeAudioContext).toHaveBeenCalled()
    expect(current?.audioStatus).toBe('off')
  })

  it('does not restart or stop an engine that is already on', async () => {
    audioRuntime.startAudioContext.mockResolvedValue('on')
    const control = createControl()
    const createEngine = vi.fn(() => control)
    audioRuntime.loadAudioEngine.mockResolvedValue(createEngine)
    await renderProbe()
    await act(async () => current?.handleEnableAudio())

    act(() => current?.handleEnableAudio())

    expect(audioRuntime.startAudioContext).toHaveBeenCalledOnce()
    expect(audioRuntime.loadAudioEngine).toHaveBeenCalledOnce()
    expect(createEngine).toHaveBeenCalledOnce()
    expect(control.stop).not.toHaveBeenCalled()
  })
})

describe('deferred audio engine failure cleanup', () => {
  it('lets only the latest repeated start request install an engine', async () => {
    const contextStart = deferred<'on'>()
    audioRuntime.startAudioContext.mockReturnValue(contextStart.promise)
    const createEngine = vi.fn(() => createControl())
    audioRuntime.loadAudioEngine.mockResolvedValue(createEngine)
    await renderProbe()

    act(() => {
      current?.handleEnableAudio()
      current?.handleEnableAudio()
    })
    await act(async () => contextStart.resolve('on'))

    expect(audioRuntime.startAudioContext).toHaveBeenCalledTimes(2)
    expect(audioRuntime.loadAudioEngine).toHaveBeenCalledOnce()
    expect(createEngine).toHaveBeenCalledOnce()
    expect(current?.audioStatus).toBe('on')
  })

  it('recovers after an engine import error without retaining the failed context', async () => {
    audioRuntime.startAudioContext.mockResolvedValue('on')
    audioRuntime.loadAudioEngine.mockRejectedValueOnce(new Error('chunk unavailable'))
    await renderProbe()

    await act(async () => current?.handleEnableAudio())

    expect(audioRuntime.closeAudioContext).toHaveBeenCalledOnce()
    expect(current?.audioStatus).toBe('error')
    expect(current?.audioError).toBe('chunk unavailable')
    expect(current?.audioEnabled).toBe(false)

    const createEngine = vi.fn(() => createControl())
    audioRuntime.loadAudioEngine.mockResolvedValueOnce(createEngine)
    await act(async () => current?.handleEnableAudio())

    expect(createEngine).toHaveBeenCalledOnce()
    expect(current?.audioStatus).toBe('on')
    expect(current?.audioError).toBeNull()
  })

  it('invalidates an in-flight import on unmount', async () => {
    const engineImport = deferred<TestAudioEngineFactory>()
    audioRuntime.startAudioContext.mockResolvedValue('on')
    audioRuntime.loadAudioEngine.mockReturnValue(engineImport.promise)
    await renderProbe()
    await act(async () => current?.handleEnableAudio())

    await act(async () => root?.unmount())
    root = null
    const createEngine = vi.fn(() => createControl())
    await act(async () => engineImport.resolve(createEngine))

    expect(createEngine).not.toHaveBeenCalled()
    expect(audioRuntime.closeAudioContext).toHaveBeenCalled()
  })
})

describe('audio import error recovery control', () => {
  it('renders a retry action that invokes the direct audio activation handler', async () => {
    const reloadPage = vi.spyOn(pageRecovery, 'reload').mockImplementation(() => undefined)
    const onEnableAudio = vi.fn()
    const props = {
      audioStatus: 'error',
      audioEnabled: false,
      audioError: 'chunk unavailable',
      masterVolume: 0.22,
      micStatus: 'off',
      micError: null,
      micSensitivity: 0.5,
      micGate: 0.25,
      inputMode: 'synth',
      onEnableAudio,
      onDisableAudio: vi.fn(),
      onEnableMic: vi.fn(),
      onDisableMic: vi.fn(),
      onMasterVolumeChange: vi.fn(),
      onMicSensitivityChange: vi.fn(),
      onMicGateChange: vi.fn(),
      onInputModeChange: vi.fn(),
      defaultOpen: true,
    } satisfies AudioMicControlsProps
    const rendered = await renderTestRoot(createElement(AudioMicControls, props))
    root = rendered.root

    const retry = rendered.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Retry audio"]',
    )
    expect(retry?.textContent).toBe('Retry audio')
    act(() => retry?.click())
    expect(onEnableAudio).toHaveBeenCalledOnce()
    const reload = Array.from(rendered.container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Reload page',
    )
    expect(reload).toBeDefined()
    act(() => reload?.click())
    expect(reloadPage).toHaveBeenCalledOnce()
    reloadPage.mockRestore()
  })
})
