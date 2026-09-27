// Characterizes the experience session's camera lifecycle contract (docs/SAFETY.md,
// docs/decisions/0001-direct-user-media-activation.md): stale requests are discarded,
// interruption never touches independently activated sound, Stop Everything preserves
// soundEnabled/inputMode, and release() leaves the session reusable. Dependencies are
// injected directly (no vi.mock by path).
import { describe, expect, it, vi } from 'vitest'
import { createExperienceSession } from '../../src/runtime/session/session'
import type { AudioEngineControl, AudioContextStatus } from '../../src/runtime/audio'
import type { RequestVideoResult } from '../../src/runtime/camera'

async function flushAsync(ticks = 4): Promise<void> {
  for (let i = 0; i < ticks; i += 1) await Promise.resolve()
}

interface FakeTrack {
  kind: 'video'
  readyState: 'live' | 'ended'
  onended: (() => void) | null
  stop: ReturnType<typeof vi.fn>
}

function fakeTrack(): FakeTrack {
  const track: FakeTrack = { kind: 'video', readyState: 'live', onended: null, stop: vi.fn() }
  track.stop.mockImplementation(() => {
    track.readyState = 'ended'
  })
  return track
}

function fakeStream(tracks: FakeTrack[]): MediaStream {
  return {
    getTracks: () => [...tracks],
    getVideoTracks: () => tracks.filter((track) => track.kind === 'video'),
  } as unknown as MediaStream
}

function fakeVideo(play: () => Promise<void> = () => Promise.resolve()): HTMLVideoElement {
  return { srcObject: null, play } as unknown as HTMLVideoElement
}

function fakeAudioControl(): AudioEngineControl {
  return {
    stop: vi.fn(),
    setMasterVolume: vi.fn(),
    setConditionAudio: vi.fn(),
    setInputMode: vi.fn(),
    setMicSensitivity: vi.fn(),
    setMicGate: vi.fn(),
    requestMic: vi.fn(),
    stopMic: vi.fn(),
    getRms: vi.fn(() => 0),
    getMetrics: vi.fn(() => ({ rms: 0, centroid: 0, flux: 0 })),
    getDebugState: vi.fn(),
    applyReactiveParams: vi.fn(),
  } as unknown as AudioEngineControl
}

function createSoundDeps() {
  const closeAudioContext = vi.fn().mockResolvedValue(undefined)
  const startAudioContext = vi.fn<() => Promise<AudioContextStatus>>().mockResolvedValue('on')
  const control = fakeAudioControl()
  const loadAudioEngine = vi.fn().mockResolvedValue(() => control)
  return { startAudioContext, closeAudioContext, loadAudioEngine, control }
}

describe('camera request sequencing', () => {
  it('disposes a late camera stream after Stop Everything wins the race', async () => {
    const track = fakeTrack()
    const stream = fakeStream([track])
    let resolveRequest: ((result: RequestVideoResult) => void) | undefined
    const requestVideoStream = vi.fn(
      () =>
        new Promise<RequestVideoResult>((resolve) => {
          resolveRequest = resolve
        }),
    )
    const session = createExperienceSession({ requestVideoStream })

    session.startCamera()
    await flushAsync()
    session.stopEverything()
    resolveRequest?.({ ok: true, stream })
    await flushAsync()

    expect(track.stop).toHaveBeenCalledOnce()
    expect(session.getSnapshot().camera).toBe('idle')
  })

  it('reports denied without ever claiming the camera is active', async () => {
    const session = createExperienceSession({
      requestVideoStream: async () => ({
        ok: false,
        error: new DOMException('denied', 'NotAllowedError'),
      }),
    })

    session.startCamera()
    await flushAsync()

    expect(session.getSnapshot().camera).toBe('denied')
    expect(session.getSnapshot().cameraIssue).toEqual({
      kind: 'request-failed',
      name: 'NotAllowedError',
      message: 'denied',
    })
  })

  it('reports a playback failure and releases the stream without claiming active', async () => {
    const track = fakeTrack()
    const stream = fakeStream([track])
    const video = fakeVideo(() => Promise.reject(new Error('blocked')))
    const session = createExperienceSession({
      requestVideoStream: async () => ({ ok: true, stream }),
    })
    session.attachStage({ video, canvas: null, fallbackCanvas: null, container: null })

    session.startCamera()
    await flushAsync()

    expect(session.getSnapshot().camera).toBe('error')
    expect(session.getSnapshot().cameraIssue).toEqual({ kind: 'playback-failed' })
    expect(track.stop).toHaveBeenCalledOnce()
    expect(video.srcObject).toBeNull()
  })
})

describe('camera interruption', () => {
  it('leaves independently activated sound on and the context open', async () => {
    const track = fakeTrack()
    const stream = fakeStream([track])
    const video = fakeVideo()
    const soundDeps = createSoundDeps()
    const session = createExperienceSession({
      requestVideoStream: async () => ({ ok: true, stream }),
      ...soundDeps,
    })
    session.attachStage({ video, canvas: null, fallbackCanvas: null, container: null })

    session.startCamera()
    await flushAsync()
    expect(session.getSnapshot().camera).toBe('active')

    session.enableSound()
    await flushAsync()
    expect(session.getSnapshot().sound).toBe('on')

    track.onended?.()
    await flushAsync()

    expect(session.getSnapshot().camera).toBe('error')
    expect(session.getSnapshot().cameraIssue).toEqual({ kind: 'interrupted' })
    expect(session.getSnapshot().sound).toBe('on')
    expect(soundDeps.closeAudioContext).not.toHaveBeenCalled()
    expect(soundDeps.control.stop).not.toHaveBeenCalled()
  })
})

describe('Stop Everything', () => {
  it('preserves soundEnabled and inputMode while stopping the engine', async () => {
    const soundDeps = createSoundDeps()
    const session = createExperienceSession({
      requestVideoStream: async () => ({ ok: true, stream: fakeStream([fakeTrack()]) }),
      ...soundDeps,
    })
    session.attachStage({ video: fakeVideo(), canvas: null, fallbackCanvas: null, container: null })

    session.startCamera()
    await flushAsync()
    session.enableSound()
    await flushAsync()
    expect(session.getSnapshot().soundEnabled).toBe(true)

    session.stopEverything()
    await flushAsync()

    expect(session.getSnapshot().sound).toBe('off')
    expect(session.getSnapshot().soundEnabled).toBe(true)
    expect(session.getSnapshot().inputMode).toBe('synth')
    expect(soundDeps.control.stop).toHaveBeenCalledOnce()
    expect(session.getSnapshot().camera).toBe('idle')
  })
})

describe('release then reuse', () => {
  it('releases resources but keeps the session usable for a fresh camera start', async () => {
    const firstTrack = fakeTrack()
    const secondTrack = fakeTrack()
    let callCount = 0
    const requestVideoStream = vi.fn(async (): Promise<RequestVideoResult> => {
      callCount += 1
      return { ok: true, stream: fakeStream([callCount === 1 ? firstTrack : secondTrack]) }
    })
    const session = createExperienceSession({ requestVideoStream })
    session.attachStage({ video: fakeVideo(), canvas: null, fallbackCanvas: null, container: null })

    session.startCamera()
    await flushAsync()
    expect(session.getSnapshot().camera).toBe('active')

    session.release()
    expect(firstTrack.stop).toHaveBeenCalledOnce()

    session.startCamera()
    await flushAsync()

    expect(session.getSnapshot().camera).toBe('active')
    expect(secondTrack.stop).not.toHaveBeenCalled()
  })
})

describe('microphone before sound', () => {
  it('is a no-op for getUserMedia because no audio engine control exists yet', () => {
    const session = createExperienceSession({})

    expect(() => session.enableMic()).not.toThrow()

    expect(session.getSnapshot().mic).toBe('off')
    expect(session.getSnapshot().inputMode).toBe('mix')
  })
})
