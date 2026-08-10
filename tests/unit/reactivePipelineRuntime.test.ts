import { describe, expect, it, vi } from 'vitest'

import { BASELINE_PROFILE } from '../../src/conditions/fallbackProfiles'
import type { Profile } from '../../src/conditions/schema'
import {
  createReactiveOverlayLifecycle,
  createReactiveOptions,
  type ReactiveOverlayModules,
  type ReactiveOverlayStartupParams,
  type ReactiveRuntime,
} from '../../src/ui/hooks/reactivePipelineRuntime'

const profile = { id: 'test' } as Profile

describe('ui/hooks/reactivePipelineRuntime', () => {
  it('merges reactive and coupled overrides in the established order', () => {
    const getVideoOverrides = vi.fn(() => ({ '0.amount': 0.2, reactiveOnly: 1 }))
    const getAudioOverrides = vi.fn(() => ({ 'audio.0.depth': 0.3 }))
    const setSettings = vi.fn()
    const step = vi.fn((_delta, _audio, _video, base) => {
      expect(base).toEqual({ base: 1, '0.amount': 0.2, reactiveOnly: 1 })
      return { video: { '0.amount': 0.8, coupledOnly: 2 }, audio: { 'audio.0.depth': 0.9 } }
    })
    const runtime = makeRuntime(getVideoOverrides, getAudioOverrides, setSettings, step)
    const applyReactiveParams = vi.fn()
    const videoMetricsRef = { current: null }
    const refs = {
      audioEngineControlRef: {
        current: {
          getMetrics: () => ({ rms: 0.1, centroid: 0.2, flux: 0.3 }),
          applyReactiveParams,
        },
      },
      videoMetricsRef,
      couplingStrengthRef: { current: 0.4 },
      maxFeedbackRef: { current: 0.5 },
      safeModeRef: { current: true },
    }
    const options = createReactiveOptions(runtime, profile, false, refs)

    const output = options.getOverrides(
      1 / 60,
      { rms: 0.3, micRms: 0.7, centroid: 0, flux: 0 },
      { motion: 0, luminance: 0, edge: 0, instability: 0 },
      { base: 1 },
    )

    expect(getVideoOverrides).toHaveBeenCalledWith(1 / 60, 0.7)
    expect(getAudioOverrides).toHaveBeenCalledWith(1 / 60, 0.7)
    expect(setSettings).toHaveBeenCalledWith({
      couplingStrength: 0.4,
      maxFeedback: 0.5,
      safeMode: true,
      reducedMotion: false,
    })
    expect(output).toEqual({
      video: { '0.amount': 0.8, reactiveOnly: 1, coupledOnly: 2 },
      audio: { 'audio.0.depth': 0.9 },
    })
    expect(options.getAudioMetrics?.()).toEqual({ rms: 0.1, centroid: 0.2, flux: 0.3 })
    options.applyAudioOverrides?.({ 'audio.0.depth': 0.6 })
    expect(applyReactiveParams).toHaveBeenCalledWith({ 'audio.0.depth': 0.6 })
    options.onVideoMetrics?.({ motion: 1, luminance: 0.5, edge: 0.2, instability: 0 })
    expect(videoMetricsRef.current).toEqual({
      motion: 1,
      luminance: 0.5,
      edge: 0.2,
      instability: 0,
    })
  })

  it('waits for camera metadata, then starts the overlay exactly once', async () => {
    const video = makeVideo({ readyState: 0, videoWidth: 0, videoHeight: 0 })
    const startOverlayLoop = vi.fn(() => makeOverlayControl())
    const modules = makeModules(startOverlayLoop)
    const loadModules = vi.fn(async () => modules)
    const onOverlayStateChange = vi.fn()
    const params = makeStartupParams(video)
    params.onOverlayStateChange = onOverlayStateChange
    const lifecycle = createReactiveOverlayLifecycle(params, loadModules)

    lifecycle.start()

    expect(video.addEventListener).toHaveBeenCalledWith('loadedmetadata', expect.any(Function))
    expect(loadModules).not.toHaveBeenCalled()

    video.setReady()
    video.dispatchLoadedMetadata()
    await vi.waitFor(() => expect(startOverlayLoop).toHaveBeenCalledOnce())

    expect(video.removeEventListener).toHaveBeenCalledWith('loadedmetadata', expect.any(Function))
    expect(modules.graphBuilder.buildVideoNodes).toHaveBeenCalledWith(BASELINE_PROFILE, {
      reducedMotion: false,
    })
    expect(startOverlayLoop).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      null,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      { onStateChange: onOverlayStateChange },
    )
  })

  it('cancels a pending startup before its dynamically loaded modules can start an overlay', async () => {
    const video = makeVideo({ readyState: 1, videoWidth: 128, videoHeight: 72 })
    const params = makeStartupParams(video)
    const startOverlayLoop = vi.fn(() => makeOverlayControl())
    const modules = makeModules(startOverlayLoop)
    let resolveModules: ((value: ReactiveOverlayModules) => void) | undefined
    const loadModules = vi.fn(
      () => new Promise<ReactiveOverlayModules>((resolve) => (resolveModules = resolve)),
    )
    const lifecycle = createReactiveOverlayLifecycle(params, loadModules)

    lifecycle.start()
    await vi.waitFor(() => expect(loadModules).toHaveBeenCalledOnce())
    lifecycle.dispose()
    resolveModules?.(modules)
    await Promise.resolve()
    await Promise.resolve()
    expect(params.overlayControlRef.current).toBeNull()
    expect(startOverlayLoop).not.toHaveBeenCalled()
  })

  it('stops an existing overlay before clearing its ref during disposal', () => {
    const video = makeVideo({ readyState: 1, videoWidth: 128, videoHeight: 72 })
    const control = makeOverlayControl()
    const overlayControlRef = { current: control }
    control.stop.mockImplementation(() => expect(overlayControlRef.current).toBe(control))
    const lifecycle = createReactiveOverlayLifecycle(makeStartupParams(video, overlayControlRef))

    lifecycle.dispose()

    expect(control.stop).toHaveBeenCalledOnce()
    expect(overlayControlRef.current).toBeNull()
  })
})

function makeVideo(initial: { readyState: number; videoWidth: number; videoHeight: number }) {
  let metadataListener: (() => void) | null = null
  const video = {
    ...initial,
    addEventListener: vi.fn((_event: string, listener: () => void) => {
      metadataListener = listener
    }),
    removeEventListener: vi.fn(),
    setReady: () => {
      video.readyState = 1
      video.videoWidth = 128
      video.videoHeight = 72
    },
    dispatchLoadedMetadata: () => metadataListener?.(),
  }
  return video as unknown as HTMLVideoElement & {
    setReady(): void
    dispatchLoadedMetadata(): void
  }
}

function makeOverlayControl() {
  return {
    stop: vi.fn(),
    setParams: vi.fn(),
  }
}

function makeStartupParams(
  video: HTMLVideoElement,
  overlayControlRef = { current: null },
): ReactiveOverlayStartupParams {
  return {
    video,
    canvas: {} as HTMLCanvasElement,
    fallbackCanvas: null,
    container: {} as HTMLDivElement,
    profile: BASELINE_PROFILE,
    reducedMotion: false,
    overlayControlRef,
    reactiveRefs: {
      audioEngineControlRef: { current: null },
      videoMetricsRef: { current: null },
      couplingStrengthRef: { current: 0.4 },
      maxFeedbackRef: { current: 0.5 },
      safeModeRef: { current: true },
    },
    safeModeRef: { current: true },
    intensityRef: { current: 0.8 },
    controlValuesRef: { current: {} },
    stressModeRef: { current: false },
  }
}

function makeModules(startOverlayLoop: ReturnType<typeof vi.fn>): ReactiveOverlayModules {
  return {
    graphBuilder: { buildVideoNodes: vi.fn(() => []) },
    reactiveRuntime: makeRuntime(
      vi.fn(() => ({})),
      vi.fn(() => ({})),
      vi.fn(),
      vi.fn(),
    ),
    canvasRuntime: { startOverlayLoop },
  }
}

function makeRuntime(
  getVideoOverrides: ReturnType<typeof vi.fn>,
  getAudioOverrides: ReturnType<typeof vi.fn>,
  setSettings: ReturnType<typeof vi.fn>,
  step: ReturnType<typeof vi.fn>,
): ReactiveRuntime {
  return {
    createReactiveDriver: () => ({ getVideoOverrides, getAudioOverrides }),
    createCouplingEngine: () => ({ setSettings, step }),
  } as unknown as ReactiveRuntime
}
