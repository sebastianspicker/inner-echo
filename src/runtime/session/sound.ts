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

function profileHasEnabledAudio(profile: Profile | null): boolean {
  return profile?.audio_stack?.enabled === true
}

function selectAudioStack(
  profile: Profile | null,
  requested: boolean,
): Profile['audio_stack'] | null {
  if (!requested) return { enabled: false }
  return profile?.audio_stack ? { ...profile.audio_stack, enabled: true } : { enabled: true }
}

function selectMasterVolume(profile: Profile | null, requested: boolean): number {
  return requested ? (profile?.audio_stack?.master?.volume ?? 0.22) : 0
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
  setSoundEnabled(enabled: boolean): void
  setMasterVolume(value: number): void
  setIntensity(value: number): void
  enableMic(): void
  disableMic(): void
  setInputMode(mode: AudioInputMode): void
  setMicSensitivity(value: number): void
  setMicGate(value: number): void
  /** Stop Everything: stop or close, but preserve soundEnabled and inputMode. */
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
    masterVolume: 0.22,
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
  state.masterVolume = selectMasterVolume(state.profile, state.enabled)
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
  force: boolean,
  requestSeq: number,
): void {
  if (requestSeq !== state.seq) return
  state.control?.stop()
  state.control = null
  const requested = profileHasEnabledAudio(state.profile) || force || state.enabled
  if (profileHasEnabledAudio(state.profile) || force) state.enabled = true
  const nextControl = createEngine(selectAudioStack(state.profile, requested), {
    onStatusChange: (nextStatus, nextError) => {
      if (requestSeq !== state.seq) return
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
  state.masterVolume = selectMasterVolume(state.profile, requested)
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
  if (state.control) state.control.stop()
  else await deps.closeAudioContext()
  state.control = null
  if (requestSeq !== state.seq) return
  state.enabled = false
  state.status = 'error'
  state.error = thrown instanceof Error ? thrown.message : String(thrown)
  deps.notify()
}

function startSound(state: SoundState, deps: SoundManagerDeps, force: boolean): void {
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
        deps.notify()
        return
      }
      try {
        const createEngine = await deps.loadAudioEngine()
        if (requestSeq !== state.seq) return
        install(state, deps, createEngine, force, requestSeq)
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
  | 'setProfile'
  | 'enableSound'
  | 'disableSound'
  | 'setSoundEnabled'
  | 'setMasterVolume'
  | 'setIntensity'
>
type LifecycleActions = Pick<SoundManager, 'stopForStopEverything' | 'releaseEngine'>
type MicActions = Pick<
  SoundManager,
  'enableMic' | 'disableMic' | 'setInputMode' | 'setMicSensitivity' | 'setMicGate'
>

function createEngineActions(state: SoundState, deps: SoundManagerDeps): EngineActions {
  return {
    setProfile(nextProfile) {
      state.profile = nextProfile
      syncProfileAudio(state, deps)
    },
    enableSound() {
      if (state.status === 'on' || state.status === 'starting') return
      startSound(state, deps, true)
    },
    disableSound: () => disableSound(state, deps),
    setSoundEnabled(nextEnabled) {
      if (!nextEnabled) {
        disableSound(state, deps)
        return
      }
      state.enabled = true
      if (state.status !== 'on' && state.status !== 'starting') startSound(state, deps, true)
      syncProfileAudio(state, deps)
      deps.notify()
    },
    setMasterVolume(value) {
      state.masterVolume = value
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
