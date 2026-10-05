/**
 * Experience session orchestrator: owns the camera, sound, and overlay managers, wires
 * their cross-cutting behavior (camera activity drives overlay activity; interruption
 * never touches sound), and exposes one immutable snapshot plus subscribe/update API.
 */
import { clampIntensity } from '../../domain/experience/safety'
import { closeAudioContext, loadAudioEngine, startAudioContext } from '../audio'
import { requestVideoStream } from '../camera'
import { createCameraManager } from './camera'
import { createOverlayManager, loadOverlayModules } from './overlay'
import { createSoundManager } from './sound'
import { clearStageCanvases } from './stage'
import { DEFAULT_LIVE_SETTINGS } from './types'
import type {
  ExperienceSession,
  LiveSettings,
  SessionDependencies,
  SessionSnapshot,
  StageElements,
} from './types'

const DEFAULT_DEPENDENCIES: SessionDependencies = {
  requestVideoStream,
  startAudioContext,
  closeAudioContext,
  loadAudioEngine,
  loadOverlayModules,
}

function snapshotsEqual(a: SessionSnapshot, b: SessionSnapshot): boolean {
  return (
    a.camera === b.camera &&
    a.cameraIssue === b.cameraIssue &&
    a.overlay === b.overlay &&
    a.sound === b.sound &&
    a.soundError === b.soundError &&
    a.soundEnabled === b.soundEnabled &&
    a.masterVolume === b.masterVolume &&
    a.mic === b.mic &&
    a.micError === b.micError &&
    a.inputMode === b.inputMode &&
    a.micSensitivity === b.micSensitivity &&
    a.micGate === b.micGate
  )
}

interface SessionManagers {
  camera: ReturnType<typeof createCameraManager>
  sound: ReturnType<typeof createSoundManager>
  overlay: ReturnType<typeof createOverlayManager>
}

interface SessionState {
  stage: StageElements | null
  liveSettings: LiveSettings
  cachedSnapshot: SessionSnapshot | null
}

function createManagers(
  dependencies: SessionDependencies,
  notifyListeners: () => void,
): SessionManagers {
  const sound = createSoundManager({
    startAudioContext: dependencies.startAudioContext,
    closeAudioContext: dependencies.closeAudioContext,
    loadAudioEngine: dependencies.loadAudioEngine,
    notify: notifyListeners,
  })
  const overlay = createOverlayManager({
    loadOverlayModules: dependencies.loadOverlayModules,
    getAudioControl: () => sound.getControl(),
    onStateChange: notifyListeners,
  })
  const camera = createCameraManager({
    requestVideoStream: dependencies.requestVideoStream,
    mediaDevices: dependencies.mediaDevices,
    onStateChange: (state) => {
      overlay.setCameraActive(state === 'active')
      notifyListeners()
    },
  })
  return { camera, sound, overlay }
}

function computeSnapshot(managers: SessionManagers): SessionSnapshot {
  const soundPart = managers.sound.getSnapshot()
  return {
    camera: managers.camera.getState(),
    cameraIssue: managers.camera.getIssue(),
    overlay: managers.overlay.getState(),
    sound: soundPart.sound,
    soundError: soundPart.soundError,
    soundEnabled: soundPart.soundEnabled,
    masterVolume: soundPart.masterVolume,
    mic: soundPart.mic,
    micError: soundPart.micError,
    inputMode: soundPart.inputMode,
    micSensitivity: soundPart.micSensitivity,
    micGate: soundPart.micGate,
  }
}

function createLifecycleActions(
  managers: SessionManagers,
  session: SessionState,
  notifyListeners: () => void,
): Pick<
  ExperienceSession,
  'attachStage' | 'update' | 'retryOverlay' | 'startCamera' | 'stopEverything' | 'release'
> {
  return {
    attachStage(nextStage) {
      session.stage = nextStage
      managers.camera.attachVideo(nextStage?.video ?? null)
      managers.overlay.attachStage(nextStage)
    },
    update(settings) {
      session.liveSettings = { ...session.liveSettings, ...settings }
      const { profile, intensity, safeMode } = session.liveSettings
      managers.sound.setProfile(profile)
      managers.sound.setIntensity(profile ? clampIntensity(profile, intensity, safeMode) : 0)
      managers.overlay.setLiveSettings(session.liveSettings)
    },
    retryOverlay: () => managers.overlay.retry(),
    startCamera: () => void managers.camera.start(),
    stopEverything() {
      managers.camera.stop()
      managers.sound.stopForStopEverything()
      clearStageCanvases(session.stage)
      notifyListeners()
    },
    release() {
      managers.overlay.stop()
      managers.sound.releaseEngine()
      managers.camera.release()
      notifyListeners()
    },
  }
}

function createSoundActions(
  managers: SessionManagers,
): Pick<
  ExperienceSession,
  | 'enableSound'
  | 'disableSound'
  | 'setSoundEnabled'
  | 'setMasterVolume'
  | 'enableMic'
  | 'disableMic'
  | 'setInputMode'
  | 'setMicSensitivity'
  | 'setMicGate'
> {
  return {
    enableSound: () => managers.sound.enableSound(),
    disableSound: () => managers.sound.disableSound(),
    setSoundEnabled: (enabled) => managers.sound.setSoundEnabled(enabled),
    setMasterVolume: (value) => managers.sound.setMasterVolume(value),
    enableMic: () => managers.sound.enableMic(),
    disableMic: () => managers.sound.disableMic(),
    setInputMode: (mode) => managers.sound.setInputMode(mode),
    setMicSensitivity: (value) => managers.sound.setMicSensitivity(value),
    setMicGate: (value) => managers.sound.setMicGate(value),
  }
}

export function createExperienceSession(
  deps: Partial<SessionDependencies> = {},
): ExperienceSession {
  const dependencies: SessionDependencies = { ...DEFAULT_DEPENDENCIES, ...deps }
  const listeners = new Set<() => void>()
  const session: SessionState = {
    stage: null,
    liveSettings: DEFAULT_LIVE_SETTINGS,
    cachedSnapshot: null,
  }
  const notifyListeners = () => {
    for (const listener of listeners) listener()
  }
  const managers = createManagers(dependencies, notifyListeners)

  return {
    getSnapshot() {
      const next = computeSnapshot(managers)
      if (session.cachedSnapshot && snapshotsEqual(session.cachedSnapshot, next)) {
        return session.cachedSnapshot
      }
      session.cachedSnapshot = next
      return next
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    ...createLifecycleActions(managers, session, notifyListeners),
    ...createSoundActions(managers),
    getDiagnostics() {
      const control = managers.sound.getControl()
      return {
        overlay: managers.overlay.getDiagnostics(),
        audio: control?.getDebugState?.(),
        audioMetrics: control?.getMetrics?.(),
        videoMetrics: managers.overlay.getVideoMetrics() ?? undefined,
        rms: control?.getRms?.() ?? 0,
      }
    },
  }
}
