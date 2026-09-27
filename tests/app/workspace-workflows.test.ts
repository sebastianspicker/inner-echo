// @vitest-environment jsdom
//
// Characterizes the live workspace's media/session workflows (docs/ARCHITECTURE.md
// "State and lifecycle ownership" and "Media and coupling flow", docs/SAFETY.md,
// docs/decisions/0001-direct-user-media-activation.md) at the rendered-UI boundary.
// Only browser APIs are faked; the real workspace, hooks, and session code run.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCloseMock, installFakeAudioContext } from './fakeAudioContext'
import {
  createDeferred,
  createFakeStream,
  endVideoTrack,
  installFakeMediaDevices,
} from './fakeBrowserMedia'
import { encodePresetToHash } from '../../src/app/experience/presets/format'
import {
  click,
  enableMicrophone,
  enableSound,
  flushAsync,
  getButton,
  getCheckboxByLabel,
  getInput,
  getInputByLabel,
  getSelect,
  mountWorkspace,
  queryButton,
  selectOption,
  startCamera,
  stopEverything,
  unmountWorkspace,
  waitFor,
  type WorkspaceHandle,
} from './workspaceTestHarness'

let handle: WorkspaceHandle | null = null
let mediaDevices: ReturnType<typeof installFakeMediaDevices>
let audioContexts: ReturnType<typeof installFakeAudioContext>

beforeEach(() => {
  mediaDevices = installFakeMediaDevices()
  audioContexts = installFakeAudioContext()
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
})

afterEach(async () => {
  await unmountWorkspace(handle)
  handle = null
  localStorage.clear()
  window.history.replaceState({}, '', '/')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('passive startup', () => {
  it('requests no camera and constructs no AudioContext on mount', async () => {
    handle = await mountWorkspace()
    expect(mediaDevices.getUserMedia).not.toHaveBeenCalled()
    expect(audioContexts.constructedCount()).toBe(0)
  })
})

describe('camera start', () => {
  it('requests video only and reaches the active camera state', async () => {
    handle = await mountWorkspace()
    await startCamera(handle.container)

    expect(mediaDevices.getUserMedia).toHaveBeenCalledOnce()
    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true, audio: false })
    expect(audioContexts.constructedCount()).toBe(0)
  })
})

describe('sound activation', () => {
  it('constructs the AudioContext synchronously within the click', async () => {
    handle = await mountWorkspace()
    click(getButton(handle.container, 'Enable audio'))

    expect(audioContexts.constructedCount()).toBe(1)
    expect(mediaDevices.getUserMedia).not.toHaveBeenCalled()

    await waitFor(() => Boolean(handle?.container.textContent?.includes('Audio: on')))
  })
})

describe('microphone requires sound', () => {
  it('has no enabled microphone action before sound is on, then activates it after', async () => {
    handle = await mountWorkspace()
    expect(queryButton(handle.container, 'Enable microphone (optional)')).toBeNull()

    await enableSound(handle.container)
    await enableMicrophone(handle.container)

    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(handle.container.textContent).toContain('Mic: on')
  })
})

describe('Stop Everything', () => {
  it('stops every track and closes audio, returning the UI to idle', async () => {
    handle = await mountWorkspace()
    await startCamera(handle.container)
    await enableSound(handle.container)
    await enableMicrophone(handle.container)

    stopEverything(handle.container)
    await flushAsync()

    for (const media of mediaDevices.streams) {
      for (const track of media.tracks) expect(track.stop).toHaveBeenCalled()
    }
    expect(getCloseMock(audioContexts.instances[0])).toHaveBeenCalled()
    expect(handle.container.textContent).not.toContain('Camera active')
    expect(handle.container.textContent).toContain('Audio: off')
    expect(queryButton(handle.container, 'Enable microphone (optional)')).toBeNull()
  })
})

describe('Stop Everything wins races', () => {
  it('stops a camera stream that resolves after Stop Everything was clicked', async () => {
    handle = await mountWorkspace()
    const pending = createDeferred<MediaStream>()
    const lateStream = createFakeStream(['video'])
    mediaDevices.getUserMedia.mockImplementationOnce(() => pending.promise)

    click(getButton(handle.container, 'Start camera'))
    await flushAsync()
    stopEverything(handle.container)
    pending.resolve(lateStream.stream)
    await flushAsync()

    expect(lateStream.tracks[0].stop).toHaveBeenCalled()
    expect(handle.container.textContent).not.toContain('Camera active')
  })

  it('discards a sound start that resolves after Stop Everything was clicked', async () => {
    handle = await mountWorkspace()
    const resumeDeferred = audioContexts.deferNextResume()

    click(getButton(handle.container, 'Enable audio'))
    await flushAsync()
    stopEverything(handle.container)
    resumeDeferred.resolve()
    await flushAsync()

    expect(handle.container.textContent).not.toContain('Audio: on')
  })
})

describe('camera interruption keeps independent audio', () => {
  it('reports a camera notice while sound stays on and the context stays open', async () => {
    handle = await mountWorkspace()
    await startCamera(handle.container)
    await enableSound(handle.container)
    const cameraStream = mediaDevices.streams.find((media) =>
      media.tracks.some((track) => track.kind === 'video'),
    )
    if (!cameraStream) throw new Error('expected a camera stream to exist')

    endVideoTrack(cameraStream)
    await flushAsync()

    expect(handle.container.textContent).toContain('briefly interrupted')
    expect(handle.container.textContent).toContain('Audio: on')
    expect(getCloseMock(audioContexts.instances[0])).not.toHaveBeenCalled()
  })
})

describe('camera denied', () => {
  it('shows the denied state and never claims the camera is active', async () => {
    handle = await mountWorkspace()
    mediaDevices.getUserMedia.mockImplementationOnce(() =>
      Promise.reject(new DOMException('denied', 'NotAllowedError')),
    )

    click(getButton(handle.container, 'Start camera'))
    await flushAsync()

    expect(handle.container.textContent).toContain('camera access was not granted')
    expect(handle.container.textContent).not.toContain('Camera active')
  })
})

describe('shared preset hash', () => {
  it('applies the configuration passively and clears the hash', async () => {
    // Mode stays "symptom" (not "preset") deliberately: a curated ("preset") condition
    // reloads its own profile and overwrites intensity with that profile's default,
    // which would mask (not test) whether the hash import itself applied intensity.
    window.history.pushState({}, '', '/?kept=1')
    window.location.hash = encodePresetToHash({
      mode: 'symptom',
      conditionId: 'none',
      presets: [],
      dimensions: [{ dimensionId: 'hyperarousal', weight: 0.6 }],
      intensity: 0.81,
      safeMode: true,
      reducedMotion: false,
      audioEnabled: true,
      couplingStrength: 0,
      maxFeedback: 0.35,
      interactionAmount: 0.15,
    })

    handle = await mountWorkspace()
    await flushAsync()

    expect(getCheckboxByLabel(handle.container, 'Hyperarousal').checked).toBe(true)
    expect(getInput(handle.container, 'core-intensity').value).toBe('0.81')
    expect(mediaDevices.getUserMedia).not.toHaveBeenCalled()
    expect(audioContexts.constructedCount()).toBe(0)
    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?kept=1')
  })

  it('ignores an invalid hash without throwing', async () => {
    window.location.hash = '#preset=not-valid-base64!!!'

    handle = await mountWorkspace()
    await flushAsync()

    expect(getInput(handle.container, 'core-intensity').value).toBe('0.5')
  })
})

describe('curated condition intensity', () => {
  // Regression for the defect where a preset payload's own intensity was overwritten by
  // the curated profile's intensity_default once the profile finished loading.
  it('keeps a preset-mode shared hash intensity after the curated profile loads', async () => {
    window.location.hash = encodePresetToHash({
      mode: 'preset',
      conditionId: 'anxiety',
      presets: [],
      dimensions: [],
      intensity: 0.81,
      safeMode: true,
      reducedMotion: false,
      audioEnabled: false,
      couplingStrength: 0,
      maxFeedback: 0.35,
      interactionAmount: 0.15,
    })

    handle = await mountWorkspace()
    await flushAsync()

    expect(getInput(handle.container, 'core-intensity').value).toBe('0.81')
  })

  // anxiety.json's safety.intensity_default (src/content/experience/profiles/anxiety.json).
  const ANXIETY_INTENSITY_DEFAULT = '0.35'

  it('resets intensity to the newly selected curated profile default', async () => {
    handle = await mountWorkspace()
    const { container } = handle
    click(getInputByLabel(container, 'Curated collections'))
    await flushAsync()

    selectOption(getSelect(container, 'condition-picker'), 'anxiety')

    await waitFor(() => getInput(container, 'core-intensity').value === ANXIETY_INTENSITY_DEFAULT)
  })
})

describe('preset load forces sound off', () => {
  // Importing a preset updates the desired configuration with audio forced off
  // (docs/ARCHITECTURE.md "Media and coupling flow").
  it('loading a saved preset while sound is on stops sound', async () => {
    handle = await mountWorkspace()
    await enableSound(handle.container)
    click(getButton(handle.container, 'Save new'))
    click(getButton(handle.container, 'Load'))
    await flushAsync()

    expect(handle.container.textContent).toContain('Audio: off')
    expect(getCloseMock(audioContexts.instances[0])).toHaveBeenCalled()
  })
})

describe('unmount cleanup', () => {
  it('releases camera and audio resources when the workspace unmounts while active', async () => {
    handle = await mountWorkspace()
    await startCamera(handle.container)
    await enableSound(handle.container)
    const [context] = audioContexts.instances

    await unmountWorkspace(handle)
    handle = null

    for (const media of mediaDevices.streams) {
      for (const track of media.tracks) expect(track.stop).toHaveBeenCalled()
    }
    expect(getCloseMock(context)).toHaveBeenCalled()
  })
})
