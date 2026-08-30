import { describe, expect, it, vi } from 'vitest'

import {
  formatDiagnosticsJson,
  formatDiagnosticsText,
} from '../../src/app/experience/session/debugDiagnosticsFormatting'
import {
  releaseCameraRuntime,
  startCameraRuntime,
  type CameraRuntimeContext,
} from '../../src/app/experience/session/cameraRuntime'

function createCameraRuntimeContext(video: HTMLVideoElement | null): CameraRuntimeContext {
  return {
    streamRef: { current: null },
    videoRef: { current: video },
    canvasRef: { current: null },
    fallbackCanvasRef: { current: null },
    overlayControlRef: { current: null },
    audioEngineControlRef: { current: null },
    cameraRequestSeqRef: { current: 0 },
    audioRequestSeqRef: { current: 0 },
    setCameraState: vi.fn(),
    setErrorMessage: vi.fn(),
    setAudioStatus: vi.fn(),
    setAudioError: vi.fn(),
    setMicStatus: vi.fn(),
    setMicError: vi.fn(),
  }
}

describe('application session contracts', () => {
  it('releases active camera, overlay, and audio resources during session cleanup', () => {
    const stopped = { track: 0, overlay: 0, audio: 0 }
    const track = {
      onended: () => {},
      stop: () => {
        stopped.track += 1
      },
    } as unknown as MediaStreamTrack
    const stream = {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream
    const video = { srcObject: stream } as unknown as HTMLVideoElement
    const context = {
      streamRef: { current: stream },
      videoRef: { current: video },
      canvasRef: { current: null },
      fallbackCanvasRef: { current: null },
      overlayControlRef: {
        current: {
          stop: () => {
            stopped.overlay += 1
          },
        },
      },
      audioEngineControlRef: {
        current: {
          stop: () => {
            stopped.audio += 1
          },
        },
      },
      cameraRequestSeqRef: { current: 4 },
      audioRequestSeqRef: { current: 8 },
    }

    releaseCameraRuntime(context)

    expect(stopped).toEqual({ track: 1, overlay: 1, audio: 1 })
    expect(track.onended).toBeNull()
    expect(context.streamRef.current).toBeNull()
    expect(video.srcObject).toBeNull()
    expect(context.overlayControlRef.current).toBeNull()
    expect(context.audioEngineControlRef.current).toBeNull()
    expect(context.cameraRequestSeqRef.current).toBe(5)
    expect(context.audioRequestSeqRef.current).toBe(9)
  })

  it('disposes a late camera stream after its request becomes stale', async () => {
    let resolveRequest: ((result: { ok: true; stream: MediaStream }) => void) | undefined
    const requestVideoStream = vi.fn(
      () =>
        new Promise<{ ok: true; stream: MediaStream }>((resolve) => {
          resolveRequest = resolve
        }),
    )
    const track = { readyState: 'live', stop: vi.fn() } as unknown as MediaStreamTrack
    const stream = {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream
    const context = createCameraRuntimeContext(null)

    const start = startCameraRuntime(context, vi.fn(), { requestVideoStream })
    context.cameraRequestSeqRef.current += 1
    resolveRequest?.({ ok: true, stream })
    await start

    expect(track.stop).toHaveBeenCalledOnce()
    expect(context.streamRef.current).toBeNull()
    expect(context.setCameraState).not.toHaveBeenCalledWith('active')
  })

  it('never reports active when camera permission or video playback fails', async () => {
    const deniedContext = createCameraRuntimeContext(null)
    await startCameraRuntime(deniedContext, vi.fn(), {
      requestVideoStream: async () => ({
        ok: false,
        error: { name: 'NotAllowedError' } as DOMException,
      }),
    })

    const track = { readyState: 'live', stop: vi.fn() } as unknown as MediaStreamTrack
    const stream = {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream
    const video = {
      srcObject: null,
      play: vi.fn().mockRejectedValue(new Error('playback blocked')),
    } as unknown as HTMLVideoElement
    const playbackContext = createCameraRuntimeContext(video)
    await startCameraRuntime(playbackContext, vi.fn(), {
      requestVideoStream: async () => ({ ok: true, stream }),
    })
    await Promise.resolve()

    expect(deniedContext.setCameraState).toHaveBeenCalledWith('denied')
    expect(deniedContext.setCameraState).not.toHaveBeenCalledWith('active')
    expect(playbackContext.setCameraState).toHaveBeenCalledWith('error')
    expect(playbackContext.setCameraState).not.toHaveBeenCalledWith('active')
    expect(track.stop).toHaveBeenCalledOnce()
    expect(video.srcObject).toBeNull()
  })

  it('formats diagnostics with explicit runtime and safety fields', () => {
    const overlay = {
      rendererMode: 'webgl' as const,
      effectsActive: true,
      fps: 59.95,
      frameTimeMs: 16.67,
      renderScale: 0.75,
      resourceCounts: {
        renderTargets: 2,
        temporalPairs: 1,
        estimatedTextures: 4,
        estimatedFramebuffers: 2,
      },
      activeVideoNodes: ['grain'],
    }
    const sources = {
      getOverlayDiagnostics: () => overlay,
      audioStatus: 'on' as const,
      micStatus: 'on' as const,
      couplingStrength: 0.6,
      maxFeedback: 0.25,
      lastError: 'none',
      getAudioMetrics: () => ({ rms: 0.1, centroid: 0.2, flux: 0.3 }),
      getVideoMetrics: () => ({ motion: 0.4, luminance: 0.5, edge: 0.6, instability: 0.7 }),
      getAppliedClamps: () => ({
        intensityInput: 0.9,
        intensityEffective: 0.4,
        safeMode: true,
        reducedMotion: true,
        safeModeClampKeys: ['max_intensity'],
        reducedMotionDisabledNodes: ['temporal_smear'],
      }),
    }

    const text = formatDiagnosticsText(sources, overlay)
    const json = JSON.parse(formatDiagnosticsJson(sources, overlay))

    expect(text).toContain('renderer: webgl')
    expect(text).toContain('clamps.intensity: 0.900 -> 0.400')
    expect(text).toContain('video.activeNodes: grain')
    expect(json).toMatchObject({
      overlay: { rendererMode: 'webgl', effectsActive: true },
      audioStatus: 'on',
      micStatus: 'on',
      appliedClamps: { intensityEffective: 0.4, reducedMotion: true },
    })
  })
})
