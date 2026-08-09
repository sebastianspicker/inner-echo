import type { Profile } from '../../conditions/schema'
import type { AudioEngineControl } from '../../engine/audio'
import type {
  OverlayControl,
  OverlayRuntimeState,
  ReactiveLoopOptions,
  VideoMetrics,
} from '../../engine/canvas'
import { BASELINE_PROFILE } from '../../conditions/fallbackProfiles'
import { clampIntensity, getSafetyContext } from '../../conditions/normalize'

export type ReactiveRuntime = typeof import('../../engine/reactive')

type MutableRef<T> = { current: T }

export interface ReactivePipelineRefs {
  audioEngineControlRef: MutableRef<AudioEngineControl | null>
  videoMetricsRef: MutableRef<VideoMetrics | null>
  couplingStrengthRef: MutableRef<number>
  maxFeedbackRef: MutableRef<number>
  safeModeRef: MutableRef<boolean>
}

export interface ReactiveOverlayElements {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  fallbackCanvas: HTMLCanvasElement | null
  container: HTMLDivElement
}

export function getReactiveOverlayElements(
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement | null,
  fallbackCanvas: HTMLCanvasElement | null,
  container: HTMLDivElement | null,
): ReactiveOverlayElements | null {
  if (!video || !canvas || !container) return null
  return { video, canvas, fallbackCanvas, container }
}

export interface ReactiveOverlayStartupParams extends ReactiveOverlayElements {
  profile: Profile | null
  reducedMotion: boolean
  overlayControlRef: MutableRef<OverlayControl | null>
  reactiveRefs: ReactivePipelineRefs
  safeModeRef: MutableRef<boolean>
  intensityRef: MutableRef<number>
  controlValuesRef: MutableRef<Record<string, number | boolean>>
  stressModeRef: MutableRef<boolean>
  onOverlayStateChange?: (state: OverlayRuntimeState) => void
}

export interface ReactiveOverlayModules {
  graphBuilder: Pick<typeof import('../../conditions/graphBuilder'), 'buildVideoNodes'>
  reactiveRuntime: ReactiveRuntime
  canvasRuntime: Pick<typeof import('../../engine/canvas'), 'startOverlayLoop'>
}

export interface ReactiveOverlayLifecycle {
  start(): void
  dispose(): void
}

export type ReactiveOverlayModuleLoader = () => Promise<ReactiveOverlayModules>

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

export function createReactiveOptions(
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

export function isVideoReady(video: HTMLVideoElement): boolean {
  return video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0
}

export function stopReactiveOverlay(overlayControlRef: MutableRef<OverlayControl | null>): void {
  if (!overlayControlRef.current) return
  overlayControlRef.current.stop()
  overlayControlRef.current = null
}

export function reportUnavailable(
  onOverlayStateChange?: (state: OverlayRuntimeState) => void,
): void {
  onOverlayStateChange?.({ rendererMode: 'unavailable', effectsActive: false, error: null })
}

export async function loadReactiveOverlayModules(): Promise<ReactiveOverlayModules> {
  const [graphBuilder, reactiveRuntime, canvasRuntime] = await Promise.all([
    import('../../conditions/graphBuilder'),
    import('../../engine/reactive'),
    import('../../engine/canvas'),
  ])
  return { graphBuilder, reactiveRuntime, canvasRuntime }
}

export function startReactiveOverlay(
  modules: ReactiveOverlayModules,
  {
    video,
    canvas,
    fallbackCanvas,
    container,
    profile,
    reducedMotion,
    overlayControlRef,
    reactiveRefs,
    safeModeRef,
    intensityRef,
    controlValuesRef,
    stressModeRef,
    onOverlayStateChange,
  }: ReactiveOverlayStartupParams,
): void {
  if (overlayControlRef.current) return

  const activeProfile = profile ?? BASELINE_PROFILE
  const nodes = modules.graphBuilder.buildVideoNodes(activeProfile, { reducedMotion })
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

  const safeMode = safeModeRef.current
  const intensity = clampIntensity(activeProfile, intensityRef.current, safeMode)
  control.setParams({
    intensity,
    safeMode,
    controlValues: {
      ...controlValuesRef.current,
      intensity,
      safeMode,
    },
    stressMode: stressModeRef.current,
    safetyContext: getSafetyContext(activeProfile),
  })
}

export function createReactiveOverlayLifecycle(
  params: ReactiveOverlayStartupParams,
  loadModules: ReactiveOverlayModuleLoader = loadReactiveOverlayModules,
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
