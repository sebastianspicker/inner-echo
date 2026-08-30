import { describe, expect, it, vi } from 'vitest'

import {
  createReactiveOverlayLifecycle,
  type ReactiveOverlayModules,
} from '../../src/app/experience/session/reactivePipelineRuntime'

describe('reactive overlay lifecycle', () => {
  it('cancels deferred module startup and cleans up metadata listeners and controls', async () => {
    const metadataListeners = new Set<() => void>()
    const fakeVideo = {
      readyState: 0,
      videoWidth: 0,
      videoHeight: 0,
      addEventListener: vi.fn((_event: string, listener: () => void) => {
        metadataListeners.add(listener)
      }),
      removeEventListener: vi.fn((_event: string, listener: () => void) => {
        metadataListeners.delete(listener)
      }),
    }
    const video = fakeVideo as unknown as HTMLVideoElement
    const startOverlayLoop = vi.fn()
    let resolveModules: ((modules: ReactiveOverlayModules) => void) | undefined
    const loadModules = vi.fn(
      () =>
        new Promise<ReactiveOverlayModules>((resolve) => {
          resolveModules = resolve
        }),
    )
    const overlayControlRef = { current: null }
    const lifecycle = createReactiveOverlayLifecycle(
      {
        video,
        canvas: {} as HTMLCanvasElement,
        fallbackCanvas: null,
        container: {} as HTMLDivElement,
        profile: null,
        reducedMotion: false,
        overlayControlRef,
        reactiveRefs: {
          audioEngineControlRef: { current: null },
          videoMetricsRef: { current: null },
          couplingStrengthRef: { current: 0 },
          maxFeedbackRef: { current: 0 },
          safeModeRef: { current: false },
        },
        safeModeRef: { current: false },
        intensityRef: { current: 0 },
        controlValuesRef: { current: {} },
        stressModeRef: { current: false },
      },
      loadModules,
    )

    lifecycle.start()
    expect(metadataListeners).toHaveLength(1)
    fakeVideo.readyState = 1
    fakeVideo.videoWidth = 1
    fakeVideo.videoHeight = 1
    for (const listener of metadataListeners) listener()
    await Promise.resolve()

    expect(loadModules).toHaveBeenCalledOnce()
    expect(metadataListeners).toHaveLength(0)
    const stop = vi.fn()
    overlayControlRef.current = { stop } as never
    lifecycle.dispose()
    resolveModules?.({
      graphBuilder: { buildVideoNodes: vi.fn() },
      reactiveRuntime: {} as never,
      canvasRuntime: { startOverlayLoop },
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(stop).toHaveBeenCalledOnce()
    expect(overlayControlRef.current).toBeNull()
    expect(startOverlayLoop).not.toHaveBeenCalled()
    expect(video.removeEventListener).toHaveBeenCalledOnce()
  })
})
