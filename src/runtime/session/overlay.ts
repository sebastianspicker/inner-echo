/**
 * Overlay + coupling lifecycle manager. Desired running state mirrors the camera:
 * active camera plus a stage and profile means running. Restarts only when the
 * canonical configuration key changes, on explicit retry, or when the camera or the
 * stage is reattached; live control values reach the running loop without a restart.
 */
import type { Profile } from '../../domain/experience/schema'
import { canonicalJson } from '../../shared/canonicalJson'
import { effectiveIntensity, getSafetyContext } from '../../domain/experience/safety'
import type { AudioEngineControl } from '../audio'
import type {
  OverlayControl,
  OverlayDiagnostics,
  OverlayRuntimeState,
  VideoMetrics,
} from '../visual/overlay'
import {
  createReactiveOverlayLifecycle,
  getReactiveOverlayElements,
  type ReactiveOverlayLifecycle,
} from './overlayReactive'
import { DEFAULT_LIVE_SETTINGS } from './types'
import type { LiveSettings, OverlayModuleLoader, Ref, StageElements } from './types'

/** Only definitions captured by the graph and coupling engines belong in this identity. */
export function overlayConfigurationKey(profile: Profile | null, reducedMotion: boolean): string {
  if (!profile) return 'unavailable'
  return (
    canonicalJson({
      video: profile.video_stack,
      audio: profile.audio_stack?.chain ?? [],
      reactive: profile.reactive?.analyser_to_params ?? [],
      safety: {
        intensityMax: profile.safety.intensity_max,
        clamps: profile.safety.safe_mode_clamps,
        disabledNodes: profile.safety.reduced_motion_policy?.disable_nodes ?? [],
      },
      reducedMotion,
    }) ?? 'unavailable'
  )
}

export async function loadOverlayModules(): ReturnType<OverlayModuleLoader> {
  const [graphBuilder, reactiveRuntime, canvasRuntime] = await Promise.all([
    import('../visual/graph'),
    import('../coupling'),
    import('../visual/overlay'),
  ])
  return { graphBuilder, reactiveRuntime, canvasRuntime }
}

const UNAVAILABLE_STATE: OverlayRuntimeState = {
  rendererMode: 'unavailable',
  effectsActive: false,
  error: null,
}

export interface OverlayManagerDeps {
  loadOverlayModules: OverlayModuleLoader
  getAudioControl(): AudioEngineControl | null
  onStateChange(state: OverlayRuntimeState): void
}

export interface OverlayManager {
  attachStage(stage: StageElements | null): void
  setCameraActive(active: boolean): void
  setLiveSettings(settings: LiveSettings): void
  retry(): void
  stop(): void
  getControl(): OverlayControl | null
  getState(): OverlayRuntimeState
  getDiagnostics(): OverlayDiagnostics | undefined
  getVideoMetrics(): VideoMetrics | null
}

interface OverlayInternal {
  stage: StageElements | null
  cameraActive: boolean
  settings: LiveSettings
  state: OverlayRuntimeState
  runningKey: string | null
  lifecycle: ReactiveOverlayLifecycle | null
  overlayControlRef: Ref<OverlayControl | null>
  videoMetricsRef: Ref<VideoMetrics | null>
  couplingStrengthRef: Ref<number>
  maxFeedbackRef: Ref<number>
  safeModeRef: Ref<boolean>
  intensityRef: Ref<number>
  diagnosticsActiveRef: Ref<boolean>
}

function createInternal(): OverlayInternal {
  return {
    stage: null,
    cameraActive: false,
    settings: DEFAULT_LIVE_SETTINGS,
    state: UNAVAILABLE_STATE,
    runningKey: null,
    lifecycle: null,
    overlayControlRef: { current: null },
    videoMetricsRef: { current: null },
    couplingStrengthRef: { current: DEFAULT_LIVE_SETTINGS.couplingStrength },
    maxFeedbackRef: { current: DEFAULT_LIVE_SETTINGS.maxFeedback },
    safeModeRef: { current: DEFAULT_LIVE_SETTINGS.safeMode },
    intensityRef: { current: 0 },
    diagnosticsActiveRef: { current: DEFAULT_LIVE_SETTINGS.diagnosticsActive },
  }
}

function setOverlayState(
  internal: OverlayInternal,
  deps: OverlayManagerDeps,
  next: OverlayRuntimeState,
): void {
  internal.state = next
  deps.onStateChange(next)
}

function disposeRunning(internal: OverlayInternal): void {
  if (!internal.lifecycle) return
  internal.lifecycle.dispose()
  internal.lifecycle = null
  internal.runningKey = null
}

function pushParams(internal: OverlayInternal): void {
  const { settings } = internal
  if (!internal.overlayControlRef.current || !settings.profile) return
  const clamped = effectiveIntensity(settings.profile, settings.intensity, settings.safeMode)
  internal.overlayControlRef.current.setParams({
    intensity: clamped,
    safeMode: settings.safeMode,
    controlValues: {
      ...settings.controlValues,
      intensity: clamped,
      safeMode: settings.safeMode,
      reducedMotion: settings.reducedMotion,
    },
    stressMode: settings.stressMode,
    safetyContext: getSafetyContext(settings.profile),
  })
}

function startLifecycle(
  internal: OverlayInternal,
  deps: OverlayManagerDeps,
  elements: NonNullable<ReturnType<typeof getReactiveOverlayElements>>,
  key: string,
): void {
  const { settings } = internal
  internal.runningKey = key
  internal.lifecycle = createReactiveOverlayLifecycle(
    {
      ...elements,
      profile: settings.profile,
      reducedMotion: settings.reducedMotion,
      overlayControlRef: internal.overlayControlRef,
      reactiveRefs: {
        audioEngineControlRef: {
          get current() {
            return deps.getAudioControl()
          },
        } as Ref<AudioEngineControl | null>,
        videoMetricsRef: internal.videoMetricsRef,
        couplingStrengthRef: internal.couplingStrengthRef,
        maxFeedbackRef: internal.maxFeedbackRef,
        safeModeRef: internal.safeModeRef,
        intensityRef: internal.intensityRef,
        diagnosticsActiveRef: internal.diagnosticsActiveRef,
      },
      safeMode: settings.safeMode,
      intensity: settings.intensity,
      controlValues: settings.controlValues,
      stressMode: settings.stressMode,
      onOverlayStateChange: (next) => setOverlayState(internal, deps, next),
    },
    deps.loadOverlayModules,
  )
  internal.lifecycle.start()
}

function sync(internal: OverlayInternal, deps: OverlayManagerDeps, forceRestart: boolean): void {
  if (!internal.cameraActive) {
    disposeRunning(internal)
    setOverlayState(internal, deps, UNAVAILABLE_STATE)
    return
  }
  const elements = getReactiveOverlayElements(internal.stage)
  if (!elements || !internal.settings.profile) {
    disposeRunning(internal)
    setOverlayState(internal, deps, UNAVAILABLE_STATE)
    return
  }
  const key = overlayConfigurationKey(internal.settings.profile, internal.settings.reducedMotion)
  if (internal.lifecycle && !forceRestart && internal.runningKey === key) return
  disposeRunning(internal)
  startLifecycle(internal, deps, elements, key)
}

export function createOverlayManager(deps: OverlayManagerDeps): OverlayManager {
  const internal = createInternal()

  return {
    attachStage(nextStage) {
      internal.stage = nextStage
      sync(internal, deps, true)
    },
    setCameraActive(active) {
      internal.cameraActive = active
      sync(internal, deps, false)
    },
    setLiveSettings(next) {
      internal.settings = next
      internal.couplingStrengthRef.current = next.couplingStrength
      internal.maxFeedbackRef.current = next.maxFeedback
      internal.safeModeRef.current = next.safeMode
      internal.intensityRef.current = next.profile
        ? effectiveIntensity(next.profile, next.intensity, next.safeMode)
        : 0
      internal.diagnosticsActiveRef.current = next.diagnosticsActive
      sync(internal, deps, false)
      pushParams(internal)
    },
    retry: () => sync(internal, deps, true),
    stop() {
      disposeRunning(internal)
      setOverlayState(internal, deps, UNAVAILABLE_STATE)
    },
    getControl: () => internal.overlayControlRef.current,
    getState: () => internal.state,
    getDiagnostics: () => internal.overlayControlRef.current?.getDiagnostics?.(),
    getVideoMetrics: () => internal.videoMetricsRef.current,
  }
}
