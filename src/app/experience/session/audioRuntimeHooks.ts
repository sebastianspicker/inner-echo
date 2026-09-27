import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import type { Profile } from '../../../domain/experience/schema'
import {
  closeAudioContext,
  loadAudioEngine,
  startAudioContext,
  type AudioContextStatus,
  type AudioEngineControl,
  type AudioEngineFactory,
  type AudioInputMode,
  type MicStatus,
} from '../../../runtime/audio/control'

export interface AudioRuntimeState {
  audioStatus: AudioContextStatus
  setAudioStatus: Dispatch<SetStateAction<AudioContextStatus>>
  audioError: string | null
  setAudioError: Dispatch<SetStateAction<string | null>>
  masterVolume: number
  setMasterVolume: Dispatch<SetStateAction<number>>
  audioEnabled: boolean
  setAudioEnabled: Dispatch<SetStateAction<boolean>>
  micStatus: MicStatus
  setMicStatus: Dispatch<SetStateAction<MicStatus>>
  micError: string | null
  setMicError: Dispatch<SetStateAction<string | null>>
  inputMode: AudioInputMode
  setInputMode: Dispatch<SetStateAction<AudioInputMode>>
  micSensitivity: number
  setMicSensitivity: Dispatch<SetStateAction<number>>
  micGate: number
  setMicGate: Dispatch<SetStateAction<number>>
}

export interface AudioRuntimeBindings {
  audioEngineControlRef: MutableRefObject<AudioEngineControl | null>
  audioRequestSeqRef: MutableRefObject<number>
  audioEnabledRef: MutableRefObject<boolean>
  inputModeRef: MutableRefObject<AudioInputMode>
  micSensitivityRef: MutableRefObject<number>
  micGateRef: MutableRefObject<number>
}

export interface AudioEngineActions {
  handleEnableAudio: () => void
  handleDisableAudio: () => void
  handleAudioEnabledChange: (enabled: boolean) => void
  handleMasterVolumeChange: (value: number) => void
}

export interface AudioInputActions {
  handleEnableMic: () => void
  handleDisableMic: () => void
  handleInputModeChange: (mode: AudioInputMode) => void
  handleMicSensitivityChange: (value: number) => void
  handleMicGateChange: (value: number) => void
}

export function useAudioRuntimeState(): AudioRuntimeState {
  const [audioStatus, setAudioStatus] = useState<AudioContextStatus>('off')
  const [audioError, setAudioError] = useState<string | null>(null)
  const [masterVolume, setMasterVolume] = useState(0.22)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [micStatus, setMicStatus] = useState<MicStatus>('off')
  const [micError, setMicError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<AudioInputMode>('synth')
  const [micSensitivity, setMicSensitivity] = useState(0.5)
  const [micGate, setMicGate] = useState(0.25)
  return {
    audioStatus,
    setAudioStatus,
    audioError,
    setAudioError,
    masterVolume,
    setMasterVolume,
    audioEnabled,
    setAudioEnabled,
    micStatus,
    setMicStatus,
    micError,
    setMicError,
    inputMode,
    setInputMode,
    micSensitivity,
    setMicSensitivity,
    micGate,
    setMicGate,
  }
}

export function useAudioRuntimeBindings(state: AudioRuntimeState): AudioRuntimeBindings {
  const audioEngineControlRef = useRef<AudioEngineControl | null>(null)
  const audioRequestSeqRef = useRef(0)
  const audioEnabledRef = useRef(state.audioEnabled)
  const inputModeRef = useRef(state.inputMode)
  const micSensitivityRef = useRef(state.micSensitivity)
  const micGateRef = useRef(state.micGate)
  audioEnabledRef.current = state.audioEnabled
  inputModeRef.current = state.inputMode
  micSensitivityRef.current = state.micSensitivity
  micGateRef.current = state.micGate
  useEffect(
    () => () => {
      audioRequestSeqRef.current += 1
      const control = audioEngineControlRef.current
      audioEngineControlRef.current = null
      if (control) control.stop()
      else void closeAudioContext()
    },
    [],
  )
  return {
    audioEngineControlRef,
    audioRequestSeqRef,
    audioEnabledRef,
    inputModeRef,
    micSensitivityRef,
    micGateRef,
  }
}

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

interface AudioActionParams {
  profileRef: MutableRefObject<Profile | null>
  state: AudioRuntimeState
  bindings: AudioRuntimeBindings
}

export function useAudioEngineActions(params: AudioActionParams): AudioEngineActions {
  const handleMicStatusChange = useMicStatusChange(params.state, params.bindings)
  const startAudio = useStartAudio({ ...params, handleMicStatusChange })
  const handleDisableAudio = useDisableAudio(params.state, params.bindings)
  const handleEnableAudio = useCallback(() => {
    if (params.state.audioStatus === 'on' || params.state.audioStatus === 'starting') return
    startAudio(true)
  }, [params.state.audioStatus, startAudio])
  const handleAudioEnabledChange = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        handleDisableAudio()
        return
      }
      params.state.setAudioEnabled(true)
      if (params.state.audioStatus !== 'on' && params.state.audioStatus !== 'starting')
        startAudio(true)
    },
    [handleDisableAudio, params.state, startAudio],
  )
  const handleMasterVolumeChange = useCallback(
    (value: number) => {
      params.state.setMasterVolume(value)
      params.bindings.audioEngineControlRef.current?.setMasterVolume(value)
    },
    [params.bindings.audioEngineControlRef, params.state.setMasterVolume],
  )
  return {
    handleEnableAudio,
    handleDisableAudio,
    handleAudioEnabledChange,
    handleMasterVolumeChange,
  }
}

function useMicStatusChange(state: AudioRuntimeState, bindings: AudioRuntimeBindings) {
  return useCallback(
    (status: MicStatus, error?: string): void => {
      state.setMicStatus(status)
      state.setMicError(error ?? null)
      if (status === 'on') {
        state.setInputMode('mix')
        bindings.audioEngineControlRef.current?.setInputMode('mix')
        return
      }
      if (!['off', 'denied', 'error'].includes(status) || bindings.inputModeRef.current === 'synth')
        return
      state.setInputMode('synth')
      bindings.audioEngineControlRef.current?.setInputMode('synth')
    },
    [bindings.audioEngineControlRef, bindings.inputModeRef, state],
  )
}

interface StartAudioParams extends AudioActionParams {
  handleMicStatusChange: (status: MicStatus, error?: string) => void
}

function useStartAudio(params: StartAudioParams): (forceEnabled: boolean) => void {
  const installAudioEngine = useInstallAudioEngine(params)
  const handleStartFailure = useAudioStartFailure(params.state, params.bindings)
  return useCallback(
    (forceEnabled: boolean): void => {
      const requestSeq = ++params.bindings.audioRequestSeqRef.current
      params.state.setAudioError(null)
      params.state.setAudioStatus('starting')
      // This call creates or resumes AudioContext synchronously in the direct action stack.
      startAudioContext()
        .then(async (status) => {
          if (requestSeq !== params.bindings.audioRequestSeqRef.current) return
          if (status !== 'on') {
            params.state.setAudioStatus(status)
            return
          }
          try {
            const createEngine = await loadAudioEngine()
            if (requestSeq !== params.bindings.audioRequestSeqRef.current) return
            installAudioEngine(createEngine, forceEnabled, requestSeq)
          } catch (error) {
            await handleStartFailure(error, requestSeq)
          }
        })
        .catch((error: unknown) => void handleStartFailure(error, requestSeq))
    },
    [handleStartFailure, installAudioEngine, params],
  )
}

function useAudioStartFailure(state: AudioRuntimeState, bindings: AudioRuntimeBindings) {
  return useCallback(
    async (error: unknown, requestSeq: number): Promise<void> => {
      if (requestSeq !== bindings.audioRequestSeqRef.current) return
      const control = bindings.audioEngineControlRef.current
      bindings.audioEngineControlRef.current = null
      if (control) control.stop()
      else await closeAudioContext()
      if (requestSeq !== bindings.audioRequestSeqRef.current) return
      state.setAudioEnabled(false)
      state.setAudioStatus('error')
      state.setAudioError(error instanceof Error ? error.message : String(error))
    },
    [bindings.audioEngineControlRef, bindings.audioRequestSeqRef, state],
  )
}

function useInstallAudioEngine(
  params: StartAudioParams,
): (createEngine: AudioEngineFactory, forceEnabled: boolean, requestSeq: number) => void {
  return useCallback(
    (createEngine: AudioEngineFactory, forceEnabled: boolean, requestSeq: number): void => {
      if (requestSeq !== params.bindings.audioRequestSeqRef.current) return
      params.bindings.audioEngineControlRef.current?.stop()
      params.bindings.audioEngineControlRef.current = null
      const profile = params.profileRef.current
      const requested =
        profileHasEnabledAudio(profile) || forceEnabled || params.bindings.audioEnabledRef.current
      if (profileHasEnabledAudio(profile) || forceEnabled) params.state.setAudioEnabled(true)
      const control = createEngine(selectAudioStack(profile, requested), {
        onStatusChange: (status, error) => {
          if (requestSeq !== params.bindings.audioRequestSeqRef.current) return
          params.state.setAudioStatus(status)
          params.state.setAudioError(error ?? null)
        },
        onMicStatusChange: (status, error) => {
          if (requestSeq !== params.bindings.audioRequestSeqRef.current) return
          params.handleMicStatusChange(status, error)
        },
      })
      if (requestSeq !== params.bindings.audioRequestSeqRef.current) {
        control.stop()
        return
      }
      params.bindings.audioEngineControlRef.current = control
      const volume = selectMasterVolume(profile, requested)
      params.state.setAudioStatus('on')
      control.setMasterVolume(volume)
      control.setInputMode(params.bindings.inputModeRef.current)
      control.setMicSensitivity(params.bindings.micSensitivityRef.current)
      control.setMicGate(params.bindings.micGateRef.current)
      params.state.setMasterVolume(volume)
    },
    [params],
  )
}

function useDisableAudio(state: AudioRuntimeState, bindings: AudioRuntimeBindings): () => void {
  return useCallback(() => {
    bindings.audioRequestSeqRef.current += 1
    const control = bindings.audioEngineControlRef.current
    if (control) control.stop()
    else void closeAudioContext()
    bindings.audioEngineControlRef.current = null
    state.setAudioEnabled(false)
    state.setAudioStatus('off')
    state.setAudioError(null)
    state.setMicStatus('off')
    state.setMicError(null)
    state.setInputMode('synth')
  }, [bindings, state])
}

export function useAudioInputActions({
  state,
  bindings,
}: Omit<AudioActionParams, 'profileRef'>): AudioInputActions {
  const handleEnableMic = useCallback(() => {
    state.setMicError(null)
    state.setInputMode('mix')
    bindings.audioEngineControlRef.current?.setInputMode('mix')
    bindings.audioEngineControlRef.current?.requestMic()
  }, [bindings.audioEngineControlRef, state.setInputMode, state.setMicError])
  const handleDisableMic = useCallback(() => {
    bindings.audioEngineControlRef.current?.stopMic()
    if (bindings.inputModeRef.current !== 'synth') {
      state.setInputMode('synth')
      bindings.audioEngineControlRef.current?.setInputMode('synth')
    }
    state.setMicStatus('off')
    state.setMicError(null)
  }, [bindings.audioEngineControlRef, bindings.inputModeRef, state])
  const handleInputModeChange = useCallback(
    (mode: AudioInputMode) => {
      state.setInputMode(mode)
      bindings.audioEngineControlRef.current?.setInputMode(mode)
    },
    [bindings.audioEngineControlRef, state.setInputMode],
  )
  const handleMicSensitivityChange = useCallback(
    (value: number) => {
      state.setMicSensitivity(value)
      bindings.audioEngineControlRef.current?.setMicSensitivity(value)
    },
    [bindings.audioEngineControlRef, state.setMicSensitivity],
  )
  const handleMicGateChange = useCallback(
    (value: number) => {
      state.setMicGate(value)
      bindings.audioEngineControlRef.current?.setMicGate(value)
    },
    [bindings.audioEngineControlRef, state.setMicGate],
  )
  useEffect(() => {
    if (state.micStatus === 'on' || state.inputMode !== 'mic') return
    state.setInputMode('synth')
    bindings.audioEngineControlRef.current?.setInputMode('synth')
  }, [bindings.audioEngineControlRef, state.inputMode, state.micStatus, state.setInputMode])
  return {
    handleEnableMic,
    handleDisableMic,
    handleInputModeChange,
    handleMicSensitivityChange,
    handleMicGateChange,
  }
}
