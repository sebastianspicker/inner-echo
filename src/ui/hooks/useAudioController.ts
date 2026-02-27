import { useCallback } from 'react'
import type { AudioContextStatus } from '../../engine/audio'

export interface UseAudioControllerParams {
  audioStatus: AudioContextStatus
  enableMic: () => void
  disableMic: () => void
  setMicEnabled: (enabled: boolean) => void
  setMicError: (message: string | null) => void
}

export function useAudioController(params: UseAudioControllerParams) {
  const { audioStatus, enableMic, disableMic, setMicEnabled, setMicError } = params

  const toggleMic = useCallback(
    (enabled: boolean) => {
      if (audioStatus !== 'on') {
        setMicEnabled(false)
        if (enabled) setMicError('Enable audio first, then enable microphone (optional).')
        else setMicError(null)
        return
      }
      setMicEnabled(enabled)
      if (enabled) enableMic()
      else disableMic()
    },
    [audioStatus, enableMic, disableMic, setMicEnabled, setMicError]
  )

  return { toggleMic }
}
