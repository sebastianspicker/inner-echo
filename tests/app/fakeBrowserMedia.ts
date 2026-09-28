// Permissive fakes for browser media APIs used to characterize the live workspace
// without touching real devices, WebGL, or a real AudioContext. Only browser-facing
// surfaces are faked: navigator.mediaDevices, window.AudioContext, and playback/rAF.
import { vi } from 'vitest'

export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

export function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export type FakeTrackKind = 'video' | 'audio'

export interface FakeMediaTrack {
  readonly kind: FakeTrackKind
  readyState: 'live' | 'ended'
  onended: (() => void) | null
  stop: ReturnType<typeof vi.fn>
}

export interface FakeMediaStreamHandle {
  stream: MediaStream
  tracks: FakeMediaTrack[]
}

function createFakeTrack(kind: FakeTrackKind): FakeMediaTrack {
  const track: FakeMediaTrack = {
    kind,
    readyState: 'live',
    onended: null,
    stop: vi.fn(),
  }
  track.stop.mockImplementation(() => {
    track.readyState = 'ended'
  })
  return track
}

/** Build a fake MediaStream carrying one fake track per requested kind. */
export function createFakeStream(kinds: FakeTrackKind[]): FakeMediaStreamHandle {
  const tracks = kinds.map(createFakeTrack)
  const byKind = (kind: FakeTrackKind) => tracks.filter((track) => track.kind === kind)
  const stream = {
    getTracks: () => [...tracks],
    getVideoTracks: () => byKind('video'),
    getAudioTracks: () => byKind('audio'),
  } as unknown as MediaStream
  return { stream, tracks }
}

/** Simulate the camera hardware ending a stream's video track (disconnect, OS revoke, ...). */
export function endVideoTrack(handle: FakeMediaStreamHandle): void {
  for (const track of handle.tracks) {
    if (track.kind !== 'video') continue
    track.readyState = 'ended'
    track.onended?.()
  }
}

export interface FakeMediaDevices {
  getUserMedia: ReturnType<typeof vi.fn>
  streams: FakeMediaStreamHandle[]
  fireDeviceChange(): void
}

function requestedKinds(constraints: MediaStreamConstraints): FakeTrackKind[] {
  const kinds: FakeTrackKind[] = []
  if (constraints.video) kinds.push('video')
  if (constraints.audio) kinds.push('audio')
  return kinds
}

/** Installs a fake navigator.mediaDevices that resolves getUserMedia immediately by default. */
export function installFakeMediaDevices(): FakeMediaDevices {
  const streams: FakeMediaStreamHandle[] = []
  const changeListeners = new Set<() => void>()
  const getUserMedia = vi.fn((constraints: MediaStreamConstraints = {}) => {
    const handle = createFakeStream(requestedKinds(constraints))
    streams.push(handle)
    return Promise.resolve(handle.stream)
  })
  const addEventListener = vi.fn((type: string, listener: () => void) => {
    if (type === 'devicechange') changeListeners.add(listener)
  })
  const removeEventListener = vi.fn((type: string, listener: () => void) => {
    if (type === 'devicechange') changeListeners.delete(listener)
  })
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, addEventListener, removeEventListener },
  })
  return {
    getUserMedia,
    streams,
    fireDeviceChange: () => {
      for (const listener of changeListeners) listener()
    },
  }
}
