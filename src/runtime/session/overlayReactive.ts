/**
 * Low-level reactive overlay pipeline: builds the coupling/reactive options the WebGL
 * frame loop reads each frame, and the deferred start/dispose lifecycle that loads
 * graph, coupling, and overlay modules only once the overlay actually needs to run.
 */
import type { Profile } from '../../domain/experience/schema'
import { BASELINE_PROFILE } from '../../domain/experience/fallbackProfile'
import { clampIntensity, getSafetyContext } from '../../domain/experience/safety'
import { IMPLEMENTED_VIDEO_NODES } from '../capabilities'
import { clamp01 } from '../../shared/numbers'
import type { AudioEngineControl, AudioMetrics } from '../audio'
import type {
  OverlayControl,
  OverlayRuntimeState,
  ReactiveLoopOptions,
  VideoMetrics,
} from '../visual/overlay'
import type { OverlayModuleLoader, OverlayModules, Ref, StageElements } from './types'

type ReactiveRuntime = OverlayModules['reactiveRuntime']

const EMPTY_AUDIO_METRICS: AudioMetrics = { rms: 0, centroid: 0, flux: 0 }
const EMPTY_VIDEO_METRICS: VideoMetrics = { motion: 0, luminance: 0, edge: 0, instability: 0 }

export interface ReactivePipelineRefs {
  audioEngineControlRef: Ref<AudioEngineControl | null>
  videoMetricsRef: Ref<VideoMetrics | null>
  couplingStrengthRef: Ref<number>
  maxFeedbackRef: Ref<number>
  safeModeRef: Ref<boolean>
  intensityRef?: Ref<number>
  diagnosticsActiveRef: Ref<boolean>
}

export interface ReactiveOverlayElements {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  fallbackCanvas: HTMLCanvasElement | null
  container: HTMLDivElement
}

export function getReactiveOverlayElements(
  stage: StageElements | null,
): ReactiveOverlayElements | null {
  if (!stage?.video || !stage.canvas || !stage.container) return null
  return {
    video: stage.video,
    canvas: stage.canvas,
    fallbackCanvas: stage.fallbackCanvas,
    container: stage.container,
  }
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

export function createOverridesGetter(
  reactiveRuntime: ReactiveRuntime,
  profile: Profile,
  reducedMotion: boolean,
  refs: ReactivePipelineRefs,
): ReactiveLoopOptions['getOverrides'] & {
  onInactive(baseControlValues: Record<string, number | boolean>): void
} {
  const driver = reactiveRuntime.createReactiveDriver(profile, { reducedMotion })
  const couplingEngine = reactiveRuntime.createCouplingEngine(profile, {
    couplingStrength: refs.couplingStrengthRef.current,
    maxFeedback: refs.maxFeedbackRef.current,
    reducedMotion,
    safeMode: refs.safeModeRef.current,
    intensity: refs.intensityRef?.current ?? 1,
  })
  const baseAfterReactive: Record<string, number | boolean> = {}
  // Shared mutable objects reused each frame to avoid GC pressure.
  // Contract: the returned function is called exactly once per animation frame;
  // callers must not hold references to outVideo/outAudio across frames.
  const outVideo: Record<string, number> = {}
  const outAudio: Record<string, number> = {}

  const syncCouplingSettings = () => {
    couplingEngine.setSettings({
      couplingStrength: refs.couplingStrengthRef.current,
      maxFeedback: refs.maxFeedbackRef.current,
      safeMode: refs.safeModeRef.current,
      intensity: refs.intensityRef?.current ?? 1,
      reducedMotion,
    })
  }
  const getOverrides: ReactiveLoopOptions['getOverrides'] = (
    delta,
    audio,
    video,
    baseControlValues,
  ) => {
    const reactiveRms = Math.max(audio.rms, audio.micRms ?? 0)
    const videoReactive = driver.getVideoOverrides(delta, reactiveRms)
    const audioReactive = driver.getAudioOverrides(delta, reactiveRms)

    clearRecord(baseAfterReactive)
    copyRecord(baseAfterReactive, baseControlValues)
    mergeNumberRecord(baseAfterReactive as Record<string, number>, videoReactive)
    syncCouplingSettings()
    const coupled = couplingEngine.step(delta, audio, video, baseAfterReactive)

    clearRecord(outVideo)
    clearRecord(outAudio)
    mergeNumberRecord(outVideo, videoReactive)
    mergeNumberRecord(outVideo, coupled.video)
    mergeNumberRecord(outAudio, audioReactive)
    mergeNumberRecord(outAudio, coupled.audio)
    return { video: outVideo, audio: outAudio }
  }
  return Object.assign(getOverrides, {
    onInactive(baseControlValues: Record<string, number | boolean>): void {
      syncCouplingSettings()
      couplingEngine.step(0, EMPTY_AUDIO_METRICS, EMPTY_VIDEO_METRICS, baseControlValues)
      refs.audioEngineControlRef.current?.resetMetricHistory?.()
    },
  })
}

export function createReactiveOptions(
  reactiveRuntime: ReactiveRuntime,
  profile: Profile,
  reducedMotion: boolean,
  refs: ReactivePipelineRefs,
): ReactiveLoopOptions {
  const hasApplicableReactivity =
    profile.reactive?.analyser_to_params?.some(
      (mapping) =>
        mapping.source === 'rms' &&
        reactiveRuntime.resolveAnalyserTarget(mapping.target, profile, { reducedMotion }) !== null,
    ) ?? false
  const couplingIsActive = () =>
    clamp01(refs.couplingStrengthRef.current) * clamp01(refs.maxFeedbackRef.current) > 0
  const diagnosticsAreActive = () => import.meta.env.DEV && refs.diagnosticsActiveRef.current
  const getOverrides = createOverridesGetter(reactiveRuntime, profile, reducedMotion, refs)

  return {
    needsVideoMetrics: () => couplingIsActive() || diagnosticsAreActive(),
    needsAudioMetrics: () => couplingIsActive() || hasApplicableReactivity,
    needsOverrides: () => couplingIsActive() || hasApplicableReactivity,
    getAudioMetrics: () =>
      refs.audioEngineControlRef.current?.getMetrics?.() ?? { rms: 0, centroid: 0, flux: 0 },
    applyAudioOverrides: (overrides) => {
      refs.audioEngineControlRef.current?.applyReactiveParams?.(overrides)
    },
    onVideoMetrics: (metrics) => {
      refs.videoMetricsRef.current = metrics
    },
    onInactive: getOverrides.onInactive,
    getOverrides,
  }
}

export function isVideoReady(video: HTMLVideoElement): boolean {
  return video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0
}

export function stopReactiveOverlay(overlayControlRef: Ref<OverlayControl | null>): void {
  if (!overlayControlRef.current) return
  overlayControlRef.current.stop()
  overlayControlRef.current = null
}

export interface ReactiveOverlayStartupParams extends ReactiveOverlayElements {
  profile: Profile | null
  reducedMotion: boolean
  overlayControlRef: Ref<OverlayControl | null>
  reactiveRefs: ReactivePipelineRefs
  safeMode: boolean
  intensity: number
  controlValues: Record<string, number | boolean>
  stressMode: boolean
  onOverlayStateChange?: (state: OverlayRuntimeState) => void
}

export function startReactiveOverlay(
  modules: OverlayModules,
  {
    video,
    canvas,
    fallbackCanvas,
    container,
    profile,
    reducedMotion,
    overlayControlRef,
    reactiveRefs,
    safeMode,
    intensity,
    controlValues,
    stressMode,
    onOverlayStateChange,
  }: ReactiveOverlayStartupParams,
): void {
  if (overlayControlRef.current) return

  const activeProfile = profile ?? BASELINE_PROFILE
  const nodes = modules.graphBuilder.buildVideoNodes(activeProfile, {
    reducedMotion,
    supportedNodeIds: IMPLEMENTED_VIDEO_NODES,
  })
  const reactiveOptions = createReactiveOptions(
    modules.reactiveRuntime,
    activeProfile,
    reducedMotion,
    reactiveRefs,
  )
  const control = modules.canvasRuntime.startOverlayLoop(
    video,
    canvas,
    fallbackCanvas,
    container,
    nodes,
    reactiveOptions,
    { onStateChange: onOverlayStateChange },
  )
  overlayControlRef.current = control

  const clampedIntensity = clampIntensity(activeProfile, intensity, safeMode)
  control.setParams({
    intensity: clampedIntensity,
    safeMode,
    controlValues: {
      ...controlValues,
      intensity: clampedIntensity,
      safeMode,
      reducedMotion,
    },
    stressMode,
    safetyContext: getSafetyContext(activeProfile),
  })
}

export interface ReactiveOverlayLifecycle {
  start(): void
  dispose(): void
}

export function createReactiveOverlayLifecycle(
  params: ReactiveOverlayStartupParams,
  loadModules: OverlayModuleLoader,
): ReactiveOverlayLifecycle {
  let cancelled = false
  let started = false
  let metadataListener: (() => void) | null = null

  const handleStartupError = (error: unknown): void => {
    if (cancelled) return
    params.onOverlayStateChange?.({
      rendererMode: 'raw',
      effectsActive: false,
      error: error instanceof Error ? error : new Error(String(error)),
    })
  }

  const startLoop = async (): Promise<void> => {
    if (cancelled || params.overlayControlRef.current) return
    const modules = await loadModules()
    if (cancelled || params.overlayControlRef.current) return
    startReactiveOverlay(modules, params)
  }

  const prepareLoop = (): void => {
    void startLoop().catch(handleStartupError)
  }

  return {
    start: () => {
      if (cancelled || started) return
      started = true
      if (isVideoReady(params.video)) {
        prepareLoop()
        return
      }

      metadataListener = (): void => {
        if (metadataListener) params.video.removeEventListener('loadedmetadata', metadataListener)
        metadataListener = null
        prepareLoop()
      }
      params.video.addEventListener('loadedmetadata', metadataListener)
    },
    dispose: () => {
      cancelled = true
      if (metadataListener) params.video.removeEventListener('loadedmetadata', metadataListener)
      metadataListener = null
      stopReactiveOverlay(params.overlayControlRef)
    },
  }
}
