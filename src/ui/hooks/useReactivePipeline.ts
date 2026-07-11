import { useEffect, type MutableRefObject } from 'react'
import type { Profile } from '../../conditions/schema'
import type { CameraState } from '../../engine/video'
import type { OverlayControl, OverlayRuntimeState, VideoMetrics } from '../../engine/canvas'
import type { AudioEngineControl, AudioMetrics } from '../../engine/audio'
import { BASELINE_PROFILE } from '../../conditions/fallbackProfiles'
import { clampIntensity, getSafetyContext } from '../../conditions/normalize'

export interface UseReactivePipelineParams {
  cameraState: CameraState
  reducedMotion: boolean
  profile: Profile | null
  videoRef: MutableRefObject<HTMLVideoElement | null>
  canvasRef: MutableRefObject<HTMLCanvasElement | null>
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
    const container = containerRef.current
    if (!video || !canvas || !container || !profile) {
      onOverlayStateChange?.({ rendererMode: 'unavailable', effectsActive: false, error: null })
      return
    }

    let listener: (() => void) | null = null
    let cancelled = false

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
      const couplingEngine = reactiveRuntime.createCouplingEngine(prof, {
        couplingStrength: couplingStrengthRef.current,
        maxFeedback: maxFeedbackRef.current,
        reducedMotion,
        safeMode: safeModeRef.current,
      })
      const reactiveOptions = {
        getAudioMetrics: () =>
          audioEngineControlRef.current?.getMetrics?.() ?? { rms: 0, centroid: 0, flux: 0 },
        applyAudioOverrides: (overrides: Record<string, number>) => {
          audioEngineControlRef.current?.applyReactiveParams?.(overrides)
        },
        onVideoMetrics: (m: VideoMetrics) => {
          videoMetricsRef.current = m
        },
        getOverrides: (() => {
          const driver = reactiveRuntime.createReactiveDriver(prof, { reducedMotion })
          const baseAfterReactive: Record<string, number | boolean> = {}
          // Shared mutable objects reused each frame to avoid GC pressure.
          // Contract: the returned IIFE is called exactly once per animation frame;
          // callers must not hold references to outVideo/outAudio across frames.
          const outVideo: Record<string, number> = {}
          const outAudio: Record<string, number> = {}
          const clear = (obj: Record<string, unknown>): void => {
            for (const k of Object.keys(obj)) delete obj[k]
          }
          const copy = (
            dst: Record<string, number | boolean>,
            src: Record<string, number | boolean>,
          ): void => {
            for (const k in src) dst[k] = src[k]
          }
          const mergeNum = (dst: Record<string, number>, src: Record<string, number>): void => {
            for (const k in src) dst[k] = src[k]
          }
          return (
            delta: number,
            audio: AudioMetrics,
            video: { motion: number; luminance: number; edge: number; instability: number },
            baseControlValues: Record<string, number | boolean>,
          ) => {
            const reactiveRms = Math.max(audio.rms, audio.micRms ?? 0)
            const videoReactive = driver.getVideoOverrides(delta, reactiveRms)
            const audioReactive = driver.getAudioOverrides(delta, reactiveRms)

            clear(baseAfterReactive)
            copy(baseAfterReactive, baseControlValues)
            mergeNum(baseAfterReactive as Record<string, number>, videoReactive)
            couplingEngine.setSettings({
              couplingStrength: couplingStrengthRef.current,
              maxFeedback: maxFeedbackRef.current,
              safeMode: safeModeRef.current,
              reducedMotion,
            })
            const coupled = couplingEngine.step(delta, audio, video, baseAfterReactive)

            clear(outVideo)
            clear(outAudio)
            mergeNum(outVideo, videoReactive)
            mergeNum(outVideo, coupled.video)
            mergeNum(outAudio, audioReactive)
            mergeNum(outAudio, coupled.audio)
            return {
              video: outVideo,
              audio: outAudio,
            }
          }
        })(),
      }
      const control = canvasRuntime.startOverlayLoop(
        video,
        canvas,
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
