import { useEffect, type MutableRefObject } from 'react'
import type { Profile } from '../../conditions/schema'
import type { CameraState } from '../../engine/video'
import type {
  OverlayControl,
  OverlayRuntimeState,
  ReactiveLoopOptions,
  VideoMetrics,
} from '../../engine/canvas'
import type { AudioEngineControl } from '../../engine/audio'
import { BASELINE_PROFILE } from '../../conditions/fallbackProfiles'
import { clampIntensity, getSafetyContext } from '../../conditions/normalize'

export interface UseReactivePipelineParams {
  cameraState: CameraState
  reducedMotion: boolean
  profile: Profile | null
  videoRef: MutableRefObject<HTMLVideoElement | null>
  canvasRef: MutableRefObject<HTMLCanvasElement | null>
  fallbackCanvasRef: MutableRefObject<HTMLCanvasElement | null>
  containerRef: MutableRefObject<HTMLDivElement | null>
  overlayControlRef: MutableRefObject<OverlayControl | null>
  audioEngineControlRef: MutableRefObject<AudioEngineControl | null>
  videoMetricsRef: MutableRefObject<VideoMetrics | null>
  couplingStrengthRef: MutableRefObject<number>
  maxFeedbackRef: MutableRefObject<number>
  safeModeRef: MutableRefObject<boolean>
  intensityRef: MutableRefObject<number>
  controlValuesRef: MutableRefObject<Record<string, number | boolean>>
  stressModeRef: MutableRefObject<boolean>
  onOverlayStateChange?: (state: OverlayRuntimeState) => void
}

type ReactiveRuntime = typeof import('../../engine/reactive')

interface ReactivePipelineRefs {
  audioEngineControlRef: MutableRefObject<AudioEngineControl | null>
  videoMetricsRef: MutableRefObject<VideoMetrics | null>
  couplingStrengthRef: MutableRefObject<number>
  maxFeedbackRef: MutableRefObject<number>
  safeModeRef: MutableRefObject<boolean>
}

function clearRecord(record: Record<string, unknown>): void {
  for (const key of Object.keys(record)) delete record[key]
}

function copyRecord(
  destination: Record<string, number | boolean>,
  source: Record<string, number | boolean>,
): void {
  for (const key in source) destination[key] = source[key]
}

function mergeNumberRecord(
  destination: Record<string, number>,
  source: Record<string, number>,
): void {
  for (const key in source) destination[key] = source[key]
}

function createOverridesGetter(
  reactiveRuntime: ReactiveRuntime,
  profile: Profile,
  reducedMotion: boolean,
  refs: ReactivePipelineRefs,
): ReactiveLoopOptions['getOverrides'] {
  const driver = reactiveRuntime.createReactiveDriver(profile, { reducedMotion })
  const couplingEngine = reactiveRuntime.createCouplingEngine(profile, {
    couplingStrength: refs.couplingStrengthRef.current,
    maxFeedback: refs.maxFeedbackRef.current,
    reducedMotion,
    safeMode: refs.safeModeRef.current,
  })
  const baseAfterReactive: Record<string, number | boolean> = {}
  // Shared mutable objects reused each frame to avoid GC pressure.
  // Contract: the returned function is called exactly once per animation frame;
  // callers must not hold references to outVideo/outAudio across frames.
  const outVideo: Record<string, number> = {}
  const outAudio: Record<string, number> = {}
  return (delta, audio, video, baseControlValues) => {
    const reactiveRms = Math.max(audio.rms, audio.micRms ?? 0)
    const videoReactive = driver.getVideoOverrides(delta, reactiveRms)
    const audioReactive = driver.getAudioOverrides(delta, reactiveRms)

    clearRecord(baseAfterReactive)
    copyRecord(baseAfterReactive, baseControlValues)
    mergeNumberRecord(baseAfterReactive as Record<string, number>, videoReactive)
    couplingEngine.setSettings({
      couplingStrength: refs.couplingStrengthRef.current,
      maxFeedback: refs.maxFeedbackRef.current,
      safeMode: refs.safeModeRef.current,
      reducedMotion,
    })
    const coupled = couplingEngine.step(delta, audio, video, baseAfterReactive)

    clearRecord(outVideo)
    clearRecord(outAudio)
    mergeNumberRecord(outVideo, videoReactive)
    mergeNumberRecord(outVideo, coupled.video)
    mergeNumberRecord(outAudio, audioReactive)
    mergeNumberRecord(outAudio, coupled.audio)
    return { video: outVideo, audio: outAudio }
  }
}

function createReactiveOptions(
  reactiveRuntime: ReactiveRuntime,
  profile: Profile,
  reducedMotion: boolean,
  refs: ReactivePipelineRefs,
): ReactiveLoopOptions {
  return {
    getAudioMetrics: () =>
      refs.audioEngineControlRef.current?.getMetrics?.() ?? { rms: 0, centroid: 0, flux: 0 },
    applyAudioOverrides: (overrides) => {
      refs.audioEngineControlRef.current?.applyReactiveParams?.(overrides)
    },
    onVideoMetrics: (metrics) => {
      refs.videoMetricsRef.current = metrics
    },
    getOverrides: createOverridesGetter(reactiveRuntime, profile, reducedMotion, refs),
  }
}

/**
 * Manages the WebGL overlay pipeline lifecycle.
 *
 * Starts the overlay loop when the camera becomes active, creates the coupling engine
 * and reactive driver per profile, and tears everything down on cleanup.
 */
export function useReactivePipeline({
  cameraState,
  reducedMotion,
  profile,
  videoRef,
  canvasRef,
  fallbackCanvasRef,
  containerRef,
  overlayControlRef,
  audioEngineControlRef,
  videoMetricsRef,
  couplingStrengthRef,
  maxFeedbackRef,
  safeModeRef,
  intensityRef,
  controlValuesRef,
  stressModeRef,
  onOverlayStateChange,
}: UseReactivePipelineParams): void {
  // biome-ignore lint/correctness/useExhaustiveDependencies: Refs are used as mutable containers read each animation frame. Adding them as deps would re-create the WebGL pipeline on every slider change.
  useEffect(() => {
    if (cameraState !== 'active') {
      if (overlayControlRef.current) {
        overlayControlRef.current.stop()
        overlayControlRef.current = null
      }
      onOverlayStateChange?.({ rendererMode: 'unavailable', effectsActive: false, error: null })
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const fallbackCanvas = fallbackCanvasRef.current
    const container = containerRef.current
    if (!video || !canvas || !container || !profile) {
      onOverlayStateChange?.({ rendererMode: 'unavailable', effectsActive: false, error: null })
      return
    }

    let listener: (() => void) | null = null
    let cancelled = false
    const reactiveRefs: ReactivePipelineRefs = {
      audioEngineControlRef,
      videoMetricsRef,
      couplingStrengthRef,
      maxFeedbackRef,
      safeModeRef,
    }

    async function startLoop(): Promise<void> {
      if (overlayControlRef.current) return
      const [graphBuilder, reactiveRuntime, canvasRuntime] = await Promise.all([
        import('../../conditions/graphBuilder'),
        import('../../engine/reactive'),
        import('../../engine/canvas'),
      ])
      if (cancelled || overlayControlRef.current) return
      const prof = profile ?? BASELINE_PROFILE
      const nodes = graphBuilder.buildVideoNodes(prof, { reducedMotion })
      const reactiveOptions = createReactiveOptions(
        reactiveRuntime,
        prof,
        reducedMotion,
        reactiveRefs,
      )
      const control = canvasRuntime.startOverlayLoop(
        video,
        canvas,
        fallbackCanvas,
        container,
        nodes,
        reactiveOptions,
        {
          onStateChange: onOverlayStateChange,
        },
      )
      overlayControlRef.current = control
      const safetyCtx = getSafetyContext(prof)
      const safeModeNow = safeModeRef.current
      const clampedIntensity = clampIntensity(prof, intensityRef.current, safeModeNow)
      control.setParams({
        intensity: clampedIntensity,
        safeMode: safeModeNow,
        controlValues: {
          ...controlValuesRef.current,
          intensity: clampedIntensity,
          safeMode: safeModeNow,
        },
        stressMode: stressModeRef.current,
        safetyContext: safetyCtx,
      })
    }

    const prepareLoop = (): void => {
      void startLoop().catch((error: unknown) => {
        if (cancelled) return
        onOverlayStateChange?.({
          rendererMode: 'raw',
          effectsActive: false,
          error: error instanceof Error ? error : new Error(String(error)),
        })
      })
    }

    if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
      prepareLoop()
    } else {
      listener = (): void => {
        if (listener) {
          video.removeEventListener('loadedmetadata', listener)
        }
        listener = null
        prepareLoop()
      }
      video.addEventListener('loadedmetadata', listener)
    }

    return () => {
      cancelled = true
      if (listener && video) video.removeEventListener('loadedmetadata', listener)
      if (overlayControlRef.current) {
        overlayControlRef.current.stop()
        overlayControlRef.current = null
      }
    }
  }, [cameraState, reducedMotion, profile])
}
