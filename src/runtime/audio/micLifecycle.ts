import { createMicGateControl } from './micGateControl'
import {
  applyMicrophoneRoutingGain,
  createMicrophoneGraph,
  setMicrophoneSensitivity,
} from './micGraph'
import { disposeMicrophoneGraph, stopMediaTracks } from './micCleanup'
import { createMicRequestRace } from './micRequestRace'
import {
  createEmptyMicrophoneGraph,
  type MicLifecycleOptions,
  type MicrophoneGraph,
} from './micTypes'
import { clamp01 } from '../../shared/numbers'
import type { AudioInputMode } from './types'
import type { MicMetricNodes } from './audioMetricSampler'

export type MicLifecycleDebugState = {
  micEnabled: boolean
  micSensitivity: number
  micGate: number
  micGateGain: number | null
}

interface MicLifecycleState {
  graph: MicrophoneGraph
  sensitivity: number
  gate: number
}

type MicGateControl = ReturnType<typeof createMicGateControl>
type MicRequestRace = ReturnType<typeof createMicRequestRace>

function stopMicrophone(
  state: MicLifecycleState,
  options: MicLifecycleOptions,
  gateControl: MicGateControl,
  requestRace: MicRequestRace,
): void {
  requestRace.invalidate()
  gateControl.stop()
  state.graph = disposeMicrophoneGraph(state.graph, options)
  gateControl.reset()
  options.onStopped()
  options.onStatusChange('off')
}

function activateRequestedMicrophone(
  state: MicLifecycleState,
  options: MicLifecycleOptions,
  gateControl: MicGateControl,
  stream: MediaStream,
  applyInputMode: () => void,
): void {
  const context = options.getContext()
  const mixer = options.getMixer()
  if (!context || !mixer || options.isDisposed()) {
    stopMediaTracks(stream)
    if (!options.isDisposed()) options.onStatusChange('error', 'Audio not ready')
    return
  }
  try {
    state.graph = createMicrophoneGraph(context, mixer, stream, options.fftSize, state.sensitivity)
    applyInputMode()
    gateControl.start()
    options.onStatusChange('on')
  } catch (error) {
    state.graph = disposeMicrophoneGraph(state.graph, options)
    gateControl.reset()
    if (!options.isDisposed()) {
      options.onStatusChange('error', error instanceof Error ? error.message : String(error))
    }
  }
}

async function requestMicrophone(
  state: MicLifecycleState,
  options: MicLifecycleOptions,
  gateControl: MicGateControl,
  requestRace: MicRequestRace,
  applyInputMode: () => void,
): Promise<void> {
  if (options.isDisposed()) return
  if (state.graph.stream) stopMicrophone(state, options, gateControl, requestRace)
  const stream = await requestRace.request()
  if (!stream) return
  activateRequestedMicrophone(state, options, gateControl, stream, applyInputMode)
}

function getDebugState(state: MicLifecycleState): MicLifecycleDebugState {
  const gain = state.graph.gateGain?.gain?.value
  return {
    micEnabled: state.graph.stream != null,
    micSensitivity: state.sensitivity,
    micGate: state.gate,
    micGateGain: typeof gain === 'number' && Number.isFinite(gain) ? gain : null,
  }
}

/** Owns the optional microphone's request lifecycle while helpers own each resource concern. */
export function createMicLifecycleController(options: MicLifecycleOptions) {
  const state: MicLifecycleState = {
    graph: createEmptyMicrophoneGraph(),
    sensitivity: 0.5,
    gate: 0.25,
  }
  const gateControl = createMicGateControl({
    ...options,
    getGraph: () => state.graph,
    getGate: () => state.gate,
  })
  const requestRace = createMicRequestRace({
    canRequest: () => Boolean(options.getContext() && options.getMixer()),
    isDisposed: options.isDisposed,
    onStatusChange: options.onStatusChange,
  })

  return {
    requestMic: (applyInputMode: () => void) =>
      requestMicrophone(state, options, gateControl, requestRace, applyInputMode),
    stopMic: () => stopMicrophone(state, options, gateControl, requestRace),
    applyRoutingGain(mode: AudioInputMode, now: number): void {
      applyMicrophoneRoutingGain(state.graph, mode, now)
    },
    setSensitivity(value: number): void {
      state.sensitivity = clamp01(value)
      setMicrophoneSensitivity(
        state.graph,
        state.sensitivity,
        options.getContext()?.currentTime ?? 0,
      )
    },
    setGate(value: number): void {
      state.gate = clamp01(value)
    },
    getMetricNodes(): MicMetricNodes {
      return {
        analyser: state.graph.analyser,
        gateGain: state.graph.gateGain,
        routingGain: state.graph.routingGain,
      }
    },
    getDebugState(): MicLifecycleDebugState {
      return getDebugState(state)
    },
  }
}
