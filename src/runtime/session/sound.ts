/**
 * Sound engine, microphone, and input-mode lifecycle. The AudioContext is created or
 * resumed synchronously inside the direct sound-enable action (ADR-0001); the engine
 * module loads afterward and installs behind a request-sequence guard.
 */
import type { Profile } from '../../domain/experience/schema'
import type {
  AudioContextStatus,
  AudioEngineControl,
  AudioEngineFactory,
  AudioInputMode,
  MicStatus,
} from '../audio'
import { DEFAULT_MASTER_VOLUME } from '../audio'

function selectAudioStack(
  profile: Profile | null,
  requested: boolean,
): Profile['audio_stack'] | null {
  if (!requested) return { enabled: false }
  return profile?.audio_stack ? { ...profile.audio_stack, enabled: true } : { enabled: true }
}

// Once the user moves the slider, their volume wins over the profile's.
function selectMasterVolume(
  profile: Profile | null,
  requested: boolean,
  userVolume: number | null,
): number {
  return requested
    ? (userVolume ?? profile?.audio_stack?.master?.volume ?? DEFAULT_MASTER_VOLUME)
    : 0
}

export interface SoundManagerDeps {
  startAudioContext(): Promise<AudioContextStatus>
  closeAudioContext(): Promise<void>
  loadAudioEngine(): Promise<AudioEngineFactory>
  notify(): void
}

export interface SoundSnapshotPart {
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

export interface SoundManager {
  setProfile(profile: Profile | null): void
  enableSound(): void
  disableSound(): void
  setMasterVolume(value: number): void
  setIntensity(value: number): void
  enableMic(): void
  disableMic(): void
  setInputMode(mode: AudioInputMode): void
  setMicSensitivity(value: number): void
  setMicGate(value: number): void
  /** Stop Everything: stop or close; keeps soundEnabled, and inputMode unless it needs the mic. */
  stopForStopEverything(): void
  /** Unmount: stop or close only; leaves visible state untouched. */
  releaseEngine(): void
  getControl(): AudioEngineControl | null
  getSnapshot(): SoundSnapshotPart
}

interface SoundState {
  profile: Profile | null
  control: AudioEngineControl | null
  seq: number
  status: AudioContextStatus
  error: string | null
  enabled: boolean
  masterVolume: number
  userVolume: number | null
  intensity: number
  mic: MicStatus
  micError: string | null
  inputMode: AudioInputMode
  micSensitivity: number
  micGate: number
}

function createInitialState(): SoundState {
  return {
    profile: null,
    control: null,
    seq: 0,
    status: 'off',
    error: null,
    enabled: false,
    masterVolume: DEFAULT_MASTER_VOLUME,
    userVolume: null,
    intensity: 1,
    mic: 'off',
    micError: null,
    inputMode: 'synth',
    micSensitivity: 0.5,
    micGate: 0.25,
  }
}

function enforceInputModeInvariant(state: SoundState): void {
  if (state.mic === 'on' || state.inputMode !== 'mic') return
  state.inputMode = 'synth'
  state.control?.setInputMode('synth')
}

function syncProfileAudio(state: SoundState, deps: SoundManagerDeps): void {
  if (state.status !== 'on' || !state.control) return
  state.control.setConditionAudio(selectAudioStack(state.profile, state.enabled))
  state.masterVolume = selectMasterVolume(state.profile, state.enabled, state.userVolume)
  state.control.setMasterVolume(state.masterVolume)
  deps.notify()
}

function onMicStatusChange(
  state: SoundState,
  deps: SoundManagerDeps,
  nextStatus: MicStatus,
  nextError?: string,
): void {
  state.mic = nextStatus
  state.micError = nextError ?? null
  if (nextStatus === 'on') {
    state.inputMode = 'mix'
    state.control?.setInputMode('mix')
  } else if (nextStatus === 'off' || nextStatus === 'denied' || nextStatus === 'error') {
    enforceInputModeInvariant(state)
  }
  deps.notify()
}

function stopEngineOrClose(state: SoundState, deps: SoundManagerDeps): void {
  if (state.control) state.control.stop()
  else void deps.closeAudioContext()
  state.control = null
}

function install(
  state: SoundState,
  deps: SoundManagerDeps,
  createEngine: AudioEngineFactory,
  requestSeq: number,
): void {
  if (requestSeq !== state.seq) return
  state.control?.stop()
  state.control = null
  state.enabled = true
  const nextControl = createEngine(selectAudioStack(state.profile, true), {
    onStatusChange: (nextStatus, nextError) => {
      if (requestSeq !== state.seq) return
      // Tear a failed engine down, so a retry starts from a clean context instead of on top of it.
      if (nextStatus === 'error') {
        void stopOrCloseFailure(state, deps, requestSeq, new Error(nextError ?? 'Audio stopped.'))
        return
      }
      state.status = nextStatus
      state.error = nextError ?? null
      deps.notify()
    },
    onMicStatusChange: (nextStatus, nextError) => {
      if (requestSeq === state.seq) onMicStatusChange(state, deps, nextStatus, nextError)
    },
  })
  if (requestSeq !== state.seq) {
    nextControl.stop()
    return
  }
  state.control = nextControl
  state.masterVolume = selectMasterVolume(state.profile, true, state.userVolume)
  state.status = 'on'
  state.control.setMasterVolume(state.masterVolume)
  state.control.setIntensity(state.intensity)
  state.control.setInputMode(state.inputMode)
  state.control.setMicSensitivity(state.micSensitivity)
  state.control.setMicGate(state.micGate)
  deps.notify()
}

async function stopOrCloseFailure(
  state: SoundState,
  deps: SoundManagerDeps,
  requestSeq: number,
  thrown: unknown,
): Promise<void> {
  if (requestSeq !== state.seq) return
  const control = state.control
  state.control = null
  control?.stop()
  // Report before awaiting the close: an in-flight close can take up to 2 s (Safari, Bluetooth).
  state.enabled = false
  state.status = 'error'
  state.error = thrown instanceof Error ? thrown.message : String(thrown)
  deps.notify()
  if (!control) await deps.closeAudioContext()
}

function startSound(state: SoundState, deps: SoundManagerDeps): void {
  const requestSeq = ++state.seq
  state.error = null
  state.status = 'starting'
  deps.notify()
  // Creates or resumes the AudioContext synchronously within the direct user action.
  deps
    .startAudioContext()
    .then(async (nextStatus) => {
      if (requestSeq !== state.seq) return
      if (nextStatus !== 'on') {
        state.status = nextStatus
        // The context manager's detailed reason only reaches listeners, and none exists yet.
        if (nextStatus === 'error') {
          state.error = 'Audio could not start. The browser may be blocking sound; try again.'
        }
        deps.notify()
        return
      }
      try {
        const createEngine = await deps.loadAudioEngine()
        if (requestSeq !== state.seq) return
        install(state, deps, createEngine, requestSeq)
      } catch (thrown) {
        await stopOrCloseFailure(state, deps, requestSeq, thrown)
      }
    })
    .catch((thrown: unknown) => void stopOrCloseFailure(state, deps, requestSeq, thrown))
}

function disableSound(state: SoundState, deps: SoundManagerDeps): void {
  state.seq += 1
  stopEngineOrClose(state, deps)
  state.enabled = false
  state.status = 'off'
  state.error = null
  state.mic = 'off'
  state.micError = null
  state.inputMode = 'synth'
  deps.notify()
}

type EngineActions = Pick<
  SoundManager,
  'setProfile' | 'enableSound' | 'disableSound' | 'setMasterVolume' | 'setIntensity'
>
type LifecycleActions = Pick<SoundManager, 'stopForStopEverything' | 'releaseEngine'>
type MicActions = Pick<
  SoundManager,
  'enableMic' | 'disableMic' | 'setInputMode' | 'setMicSensitivity' | 'setMicGate'
>

function createEngineActions(state: SoundState, deps: SoundManagerDeps): EngineActions {
  return {
    setProfile(nextProfile) {
      if (nextProfile === state.profile) return
      state.profile = nextProfile
      syncProfileAudio(state, deps)
    },
    enableSound() {
      if (state.status === 'on' || state.status === 'starting') return
      startSound(state, deps)
    },
    disableSound: () => disableSound(state, deps),
    setMasterVolume(value) {
      state.masterVolume = value
      state.userVolume = value
      state.control?.setMasterVolume(value)
      deps.notify()
    },
    setIntensity(value) {
      state.intensity = value
      state.control?.setIntensity(value)
    },
  }
}

function createLifecycleActions(state: SoundState, deps: SoundManagerDeps): LifecycleActions {
  return {
    stopForStopEverything() {
      state.seq += 1
      stopEngineOrClose(state, deps)
      state.status = 'off'
      state.error = null
      state.mic = 'off'
      state.micError = null
      // The engine's mic-off callback is ignored after the seq bump, so enforce it here.
      enforceInputModeInvariant(state)
      deps.notify()
    },
    releaseEngine() {
      state.seq += 1
      stopEngineOrClose(state, deps)
    },
  }
}

function createMicActions(state: SoundState, deps: SoundManagerDeps): MicActions {
  return {
    enableMic() {
      state.micError = null
      state.inputMode = 'mix'
      state.control?.setInputMode('mix')
      state.control?.requestMic()
      deps.notify()
    },
    disableMic() {
      state.control?.stopMic()
      if (state.inputMode !== 'synth') {
        state.inputMode = 'synth'
        state.control?.setInputMode('synth')
      }
      state.mic = 'off'
      state.micError = null
      deps.notify()
    },
    setInputMode(mode) {
      state.inputMode = mode
      state.control?.setInputMode(mode)
      deps.notify()
    },
    setMicSensitivity(value) {
      state.micSensitivity = value
      state.control?.setMicSensitivity(value)
      deps.notify()
    },
    setMicGate(value) {
      state.micGate = value
      state.control?.setMicGate(value)
      deps.notify()
    },
  }
}

export function createSoundManager(deps: SoundManagerDeps): SoundManager {
  const state = createInitialState()
  return {
    ...createEngineActions(state, deps),
    ...createLifecycleActions(state, deps),
    ...createMicActions(state, deps),
    getControl: () => state.control,
    getSnapshot: () => ({
      sound: state.status,
      soundError: state.error,
      soundEnabled: state.enabled,
      masterVolume: state.masterVolume,
      mic: state.mic,
      micError: state.micError,
      inputMode: state.inputMode,
      micSensitivity: state.micSensitivity,
      micGate: state.micGate,
    }),
  }
}
