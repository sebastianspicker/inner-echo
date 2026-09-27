import type { MutableRefObject } from 'react'
import type { Profile } from '../../../domain/experience/schema'
import {
  useAudioEngineActions,
  useAudioInputActions,
  useAudioRuntimeBindings,
  useAudioRuntimeState,
} from './audioRuntimeHooks'

export interface UseAudioRuntimeParams {
  profileRef: MutableRefObject<Profile | null>
}

export function useAudioRuntime({ profileRef }: UseAudioRuntimeParams) {
  const state = useAudioRuntimeState()
  const bindings = useAudioRuntimeBindings(state)
  const engineActions = useAudioEngineActions({ profileRef, state, bindings })
  const inputActions = useAudioInputActions({ state, bindings })
  return { ...state, ...bindings, ...engineActions, ...inputActions }
}
