import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { Profile } from '../../conditions/schema'
import {
  createAudioEngine,
  closeAudioContext,
  startAudioContext,
  type AudioContextStatus,
  type AudioEngineControl,
  type AudioInputMode,
  type MicStatus,
} from '../../engine/audio'

export interface UseAudioRuntimeParams {
  profileRef: MutableRefObject<Profile | null>
}

function profileHasEnabledAudio(profile: Profile | null): boolean {
  return profile?.audio_stack?.enabled === true
}

function selectAudioStack(
  profile: Profile | null,
  audioRequested: boolean,
): Profile['audio_stack'] | null {
  if (!audioRequested) return { enabled: false }
  const audioStack = profile?.audio_stack
  return audioStack ? { ...audioStack, enabled: true } : { enabled: true }
}

function selectMasterVolume(profile: Profile | null, audioRequested: boolean): number {
  return audioRequested ? (profile?.audio_stack?.master?.volume ?? 0.22) : 0
}

export function useAudioRuntime({ profileRef }: UseAudioRuntimeParams) {
  const [audioStatus, setAudioStatus] = useState<AudioContextStatus>('off')
  const [audioError, setAudioError] = useState<string | null>(null)
  const [masterVolume, setMasterVolume] = useState(0.22)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [micStatus, setMicStatus] = useState<MicStatus>('off')
  const [micError, setMicError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<AudioInputMode>('synth')
  const [micSensitivity, setMicSensitivity] = useState(0.5)
  const [micGate, setMicGate] = useState(0.25)

  const audioEngineControlRef = useRef<AudioEngineControl | null>(null)
  const audioRequestSeqRef = useRef(0)
  const audioEnabledRef = useRef(audioEnabled)
  const inputModeRef = useRef(inputMode)
  const micSensitivityRef = useRef(micSensitivity)
  const micGateRef = useRef(micGate)

  audioEnabledRef.current = audioEnabled
  inputModeRef.current = inputMode
  micSensitivityRef.current = micSensitivity
  micGateRef.current = micGate

  const handleMicStatusChange = useCallback((status: MicStatus, error?: string): void => {
    setMicStatus(status)
    setMicError(error ?? null)
    if (status === 'on') {
      setInputMode('mix')
      audioEngineControlRef.current?.setInputMode('mix')
      return
    }
    if (!['off', 'denied', 'error'].includes(status) || inputModeRef.current === 'synth') return
    setInputMode('synth')
    audioEngineControlRef.current?.setInputMode('synth')
  }, [])

  const installAudioEngine = useCallback(
    (forceEnabled: boolean, requestSeq: number): void => {
      audioEngineControlRef.current?.stop()
      audioEngineControlRef.current = null
      const currentProfile = profileRef.current
      const currentAudioEnabled = forceEnabled || audioEnabledRef.current
      const profileHasAudio = profileHasEnabledAudio(currentProfile)
      const audioRequested = profileHasAudio || currentAudioEnabled
      const audioStack = selectAudioStack(currentProfile, audioRequested)
      if (profileHasAudio || forceEnabled) setAudioEnabled(true)
      const control = createAudioEngine(audioStack, {
        onStatusChange(status, error) {
          setAudioStatus(status)
          setAudioError(error ?? null)
        },
        onMicStatusChange: handleMicStatusChange,
      })
      if (requestSeq !== audioRequestSeqRef.current) {
        control.stop()
        return
      }
      audioEngineControlRef.current = control
      setAudioStatus('on')
      const volume = selectMasterVolume(currentProfile, audioRequested)
      control.setMasterVolume(volume)
      control.setInputMode(inputModeRef.current)
      control.setMicSensitivity(micSensitivityRef.current)
      control.setMicGate(micGateRef.current)
      setMasterVolume(volume)
    },
    [handleMicStatusChange, profileRef],
  )

  const startAudio = useCallback(
    (forceEnabled: boolean): void => {
      const requestSeq = ++audioRequestSeqRef.current
      setAudioError(null)
      setAudioStatus('starting')
      startAudioContext()
        .then((status) => {
          if (requestSeq !== audioRequestSeqRef.current) return
          if (status === 'on') installAudioEngine(forceEnabled, requestSeq)
          else setAudioStatus(status)
        })
        .catch((error: unknown) => {
          if (requestSeq !== audioRequestSeqRef.current) return
          setAudioStatus('error')
          setAudioError(error instanceof Error ? error.message : String(error))
        })
    },
    [installAudioEngine],
  )

  const handleEnableAudio = useCallback(() => startAudio(true), [startAudio])

  const handleDisableAudio = useCallback(() => {
    audioRequestSeqRef.current += 1
    const control = audioEngineControlRef.current
    if (control) control.stop()
    else void closeAudioContext()
    audioEngineControlRef.current = null
    setAudioEnabled(false)
    setAudioStatus('off')
    setAudioError(null)
    setMicStatus('off')
    setMicError(null)
    setInputMode('synth')
  }, [])

  const handleAudioEnabledChange = useCallback(
    (enabled: boolean): void => {
      setAudioEnabled(enabled)
      if (enabled && audioStatus !== 'on' && audioStatus !== 'starting') startAudio(true)
    },
    [audioStatus, startAudio],
  )

  const handleMasterVolumeChange = useCallback((value: number) => {
    setMasterVolume(value)
    audioEngineControlRef.current?.setMasterVolume(value)
  }, [])

  const handleEnableMic = useCallback(() => {
    setMicError(null)
    setInputMode('mix')
    audioEngineControlRef.current?.setInputMode('mix')
    audioEngineControlRef.current?.requestMic()
  }, [])

  const handleDisableMic = useCallback(() => {
    audioEngineControlRef.current?.stopMic()
    if (inputModeRef.current !== 'synth') {
      setInputMode('synth')
      audioEngineControlRef.current?.setInputMode('synth')
    }
    setMicStatus('off')
    setMicError(null)
  }, [])

  const handleInputModeChange = useCallback((mode: AudioInputMode) => {
    setInputMode(mode)
    audioEngineControlRef.current?.setInputMode(mode)
  }, [])

  const handleMicSensitivityChange = useCallback((value: number) => {
    setMicSensitivity(value)
    audioEngineControlRef.current?.setMicSensitivity(value)
  }, [])

  const handleMicGateChange = useCallback((value: number) => {
    setMicGate(value)
    audioEngineControlRef.current?.setMicGate(value)
  }, [])

  useEffect(() => {
    if (micStatus === 'on' || inputMode !== 'mic') return
    setInputMode('synth')
    audioEngineControlRef.current?.setInputMode('synth')
  }, [micStatus, inputMode])

  return {
    audioStatus,
    setAudioStatus,
    audioError,
    setAudioError,
    masterVolume,
    setMasterVolume,
    audioEnabled,
    micStatus,
    setMicStatus,
    micError,
    setMicError,
    inputMode,
    micSensitivity,
    micGate,
    audioEngineControlRef,
    audioRequestSeqRef,
    handleEnableAudio,
    handleDisableAudio,
    handleAudioEnabledChange,
    handleMasterVolumeChange,
    handleEnableMic,
    handleDisableMic,
    handleInputModeChange,
    handleMicSensitivityChange,
    handleMicGateChange,
  }
}
