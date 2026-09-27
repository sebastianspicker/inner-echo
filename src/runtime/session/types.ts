/**
 * Public types for the framework-free experience session. `index.ts` re-exports the
 * subset the app needs so app code has one runtime entry point for media lifecycle.
 */
import type { Profile } from '../../domain/experience/schema'
import type {
  AudioContextStatus,
  AudioEngineDebugState,
  AudioEngineFactory,
  AudioInputMode,
  AudioMetrics,
  MicStatus,
} from '../audio'
import type { CameraState, RequestVideoResult } from '../camera'
import type { OverlayDiagnostics, OverlayRuntimeState, VideoMetrics } from '../visual/overlay'

/** A mutable single-value holder; the runtime-local equivalent of a React ref. */
export interface Ref<T> {
  current: T
}

export interface StageElements {
  video: HTMLVideoElement | null
  canvas: HTMLCanvasElement | null
  fallbackCanvas: HTMLCanvasElement | null
  container: HTMLDivElement | null
}

/** Facts the runtime observed; the app maps these to user-facing copy. */
export type CameraIssue =
  | { kind: 'request-failed'; name: string; message: string }
  | { kind: 'playback-failed' }
  | { kind: 'interrupted' }
  | { kind: 'disconnected' }

export interface LiveSettings {
  profile: Profile | null
  reducedMotion: boolean
  safeMode: boolean
  intensity: number
  stressMode: boolean
  controlValues: Record<string, number | boolean>
  couplingStrength: number
  maxFeedback: number
  diagnosticsActive: boolean
}

/** Values used before the app sends its first `update()`. */
export const DEFAULT_LIVE_SETTINGS: LiveSettings = {
  profile: null,
  reducedMotion: false,
  safeMode: true,
  intensity: 0,
  stressMode: false,
  controlValues: {},
  couplingStrength: 0,
  maxFeedback: 0.35,
  diagnosticsActive: false,
}

export interface SessionSnapshot {
  camera: CameraState
  cameraIssue: CameraIssue | null
  overlay: OverlayRuntimeState
  sound: AudioContextStatus
  soundError: string | null
  soundEnabled: boolean
  masterVolume: number
  mic: MicStatus
  micError: string | null
  inputMode: AudioInputMode
  micSensitivity: number
  micGate: number
}

export interface SessionDiagnostics {
  overlay?: OverlayDiagnostics
  audio?: AudioEngineDebugState
  audioMetrics?: AudioMetrics
  videoMetrics?: VideoMetrics
  rms: number
}

/** Modules loaded lazily only after the overlay actually needs to run. */
export interface OverlayModules {
  graphBuilder: Pick<typeof import('../visual/graph'), 'buildVideoNodes'>
  reactiveRuntime: typeof import('../coupling')
  canvasRuntime: Pick<typeof import('../visual/overlay'), 'startOverlayLoop'>
}
export type OverlayModuleLoader = () => Promise<OverlayModules>

export interface SessionDependencies {
  requestVideoStream: () => Promise<RequestVideoResult>
  startAudioContext: () => Promise<AudioContextStatus>
  closeAudioContext: () => Promise<void>
  loadAudioEngine: () => Promise<AudioEngineFactory>
  loadOverlayModules: OverlayModuleLoader
  mediaDevices?: Pick<MediaDevices, 'addEventListener' | 'removeEventListener'>
}

export interface ExperienceSession {
  getSnapshot(): SessionSnapshot
  subscribe(listener: () => void): () => void
  attachStage(stage: StageElements | null): void
  update(settings: Partial<LiveSettings>): void
  retryOverlay(): void
  startCamera(): void
  stopEverything(): void
  release(): void
  enableSound(): void
  disableSound(): void
  setSoundEnabled(enabled: boolean): void
  setMasterVolume(value: number): void
  enableMic(): void
  disableMic(): void
  setInputMode(mode: AudioInputMode): void
  setMicSensitivity(value: number): void
  setMicGate(value: number): void
  getDiagnostics(): SessionDiagnostics
}
