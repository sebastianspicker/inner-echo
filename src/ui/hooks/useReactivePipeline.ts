import { useEffect, type MutableRefObject } from 'react'
import type { Profile } from '../../conditions/schema'
import type { CameraState } from '../../engine/video'
import type { OverlayControl, VideoMetrics } from '../../engine/canvas'
import type { AudioEngineControl } from '../../engine/audio'
import { BASELINE_PROFILE } from '../../conditions/fallbackProfiles'
import { buildVideoNodes } from '../../conditions/graphBuilder'
import { createReactiveDriver, createCouplingEngine } from '../../engine/reactive'
import { startOverlayLoop } from '../../engine/canvas'
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
}: UseReactivePipelineParams): void {
  useEffect(() => {
    if (cameraState !== 'active') {
      if (overlayControlRef.current) {
        overlayControlRef.current.stop()
        overlayControlRef.current = null
      }
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!video || !canvas || !container) return
    if (!profile) return

    let listener: (() => void) | null = null

    function startLoop(): void {
      if (overlayControlRef.current) return
      const prof = profile ?? BASELINE_PROFILE
      const nodes = buildVideoNodes(prof, { reducedMotion })
      const couplingEngine = createCouplingEngine(prof, {
        couplingStrength: couplingStrengthRef.current,
        maxFeedback: maxFeedbackRef.current,
        reducedMotion,
        safeMode: safeModeRef.current,
      })
      const reactiveOptions = {
        getAudioMetrics: () => audioEngineControlRef.current?.getMetrics?.() ?? { rms: 0, centroid: 0, flux: 0 },
        getRms: () => audioEngineControlRef.current?.getRms?.() ?? 0,
        applyAudioOverrides: (overrides: Record<string, number>) => {
          audioEngineControlRef.current?.applyReactiveParams?.(overrides)
        },
        onVideoMetrics: (m: VideoMetrics) => {
          videoMetricsRef.current = m
        },
        getOverrides: (() => {
          const driver = createReactiveDriver(prof, { reducedMotion })
          const baseAfterReactive: Record<string, number | boolean> = {}
          const outVideo: Record<string, number> = {}
          const outAudio: Record<string, number> = {}
          const clear = (obj: Record<string, unknown>): void => {
            for (const k of Object.keys(obj)) delete obj[k]
          }
          const copy = (dst: Record<string, number | boolean>, src: Record<string, number | boolean>): void => {
            for (const k in src) dst[k] = src[k]
          }
          const mergeNum = (dst: Record<string, number>, src: Record<string, number>): void => {
            for (const k in src) dst[k] = src[k]
          }
          return (
            delta: number,
            audio: { rms: number; centroid: number; flux: number },
            video: { motion: number; luminance: number; edge: number; instability: number },
            baseControlValues: Record<string, number | boolean>
          ) => {
            const videoReactive = driver.getVideoOverrides(delta, audio.rms)
            const audioReactive = driver.getAudioOverrides(delta, audio.rms)

            clear(baseAfterReactive)
            copy(baseAfterReactive, baseControlValues)
            mergeNum(baseAfterReactive as Record<string, number>, videoReactive)
            couplingEngine.setSettings({
              couplingStrength: couplingStrengthRef.current,
              maxFeedback: maxFeedbackRef.current,
              safeMode: safeModeRef.current,
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
      const control = startOverlayLoop(
        video,
        canvas,
        container,
        nodes,
        reactiveOptions
      )
      overlayControlRef.current = control
      const safetyCtx = getSafetyContext(prof)
      const safeModeNow = safeModeRef.current
      const clampedIntensity = clampIntensity(prof, intensityRef.current, safeModeNow)
      control.setParams({
        intensity: clampedIntensity,
        safeMode: safeModeNow,
        controlValues: { ...controlValuesRef.current, intensity: clampedIntensity, safeMode: safeModeNow },
        stressMode: stressModeRef.current,
        safetyContext: safetyCtx,
      })
    }

    if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
      startLoop()
    } else {
      listener = (): void => {
        if (listener) {
          video.removeEventListener('loadedmetadata', listener)
        }
        listener = null
        startLoop()
      }
      video.addEventListener('loadedmetadata', listener)
    }

    return () => {
      if (listener && video) video.removeEventListener('loadedmetadata', listener)
      if (overlayControlRef.current) {
        overlayControlRef.current.stop()
        overlayControlRef.current = null
      }
    }
  }, [cameraState, reducedMotion, profile])
}
