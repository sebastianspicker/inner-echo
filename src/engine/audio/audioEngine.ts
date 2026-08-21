/** Browser-gated orchestration for a profile-driven audio engine. */

import type { AudioStackConfig } from '../../conditions/schema'
import { logger } from '../../utils/logger'
import {
  addAudioContextListener,
  closeAudioContext,
  getAudioContext,
  startAudioContext,
} from './contextManager'
import { createAudioGraphSession } from './audioGraphSession'
import { createAudioMetricSampler } from './audioMetricSampler'
import { createMicLifecycleController } from './micLifecycle'
import type { AudioContextStatus, AudioInputMode, AudioMetrics, MicStatus } from './types'

const RAMP_MS = 25
const ANALYSER_FFT_SIZE = 2048

const safeDisconnect = (node: AudioNode | null) => {
  if (!node) return
  try {
    node.disconnect()
  } catch (error) {
    // Already disconnected or never connected: either is safe to ignore.
    logger.debug('Audio node disconnect ignored', error)
  }
}

export interface AudioEngineCallbacks {
  onStatusChange?(status: AudioContextStatus, error?: string): void
  onMicStatusChange?(status: MicStatus, error?: string): void
}

export interface AudioEngineDebugState {
  activeNodes: string[]
  inputMode: AudioInputMode
  micEnabled: boolean
  micSensitivity: number
  micGate: number
  micGateGain: number | null
}

export interface AudioEngineControl {
  setMasterVolume(value: number): void
  setConditionAudio(audioStack: AudioStackConfig | null | undefined): void
  getRms(): number
  getMetrics(): AudioMetrics
  applyReactiveParams(overrides: Record<string, number>): void
  requestMic(): void
  stopMic(): void
  setInputMode(mode: AudioInputMode): void
  setMicSensitivity(value: number): void
  setMicGate(value: number): void
  getDebugState(): AudioEngineDebugState
  stop(): void
}

interface AudioEngineRuntimeState {
  inputMode: AudioInputMode
  disposed: boolean
  unsubscribe: (() => void) | null
}

interface AudioEngineControlDependencies {
  state: AudioEngineRuntimeState
  graphSession: ReturnType<typeof createAudioGraphSession>
  metricSampler: ReturnType<typeof createAudioMetricSampler>
  micController: ReturnType<typeof createMicLifecycleController>
  applyInputMode(): void
}

function createAudioEngineControl({
  state,
  graphSession,
  metricSampler,
  micController,
  applyInputMode,
}: AudioEngineControlDependencies): AudioEngineControl {
  return {
    setMasterVolume(value) {
      graphSession.setMasterVolume(value)
    },
    setConditionAudio(audioStack) {
      graphSession.setConditionAudio(audioStack)
    },
    getRms() {
      return metricSampler.getRms(graphSession.getAnalyser())
    },
    getMetrics() {
      return metricSampler.getMetrics(
        graphSession.getAnalyser(),
        micController.getMetricNodes(),
        state.inputMode,
      )
    },
    applyReactiveParams(overrides) {
      graphSession.applyReactiveParams(overrides)
    },
    requestMic() {
      void micController.requestMic(applyInputMode)
    },
    stopMic: micController.stopMic,
    setInputMode(mode) {
      state.inputMode = mode
      applyInputMode()
    },
    setMicSensitivity: micController.setSensitivity,
    setMicGate: micController.setGate,
    getDebugState() {
      return {
        activeNodes: graphSession.getActiveNodes(),
        inputMode: state.inputMode,
        ...micController.getDebugState(),
      }
    },
    stop() {
      if (state.disposed) return
      state.disposed = true
      graphSession.cancelScheduledSwitch()
      micController.stopMic()
      state.unsubscribe?.()
      state.unsubscribe = null
      graphSession.dispose()
      void closeAudioContext().catch((error) => logger.warn('closeAudioContext failed', error))
    },
  }
}

/**
 * Create this only from a user gesture: browsers gate AudioContext startup and
 * microphone access. The returned controls remain safe before initialization.
 */
export function createAudioEngine(
  initialAudioStack: AudioStackConfig | null | undefined,
  callbacks: AudioEngineCallbacks = {},
): AudioEngineControl {
  const state: AudioEngineRuntimeState = {
    inputMode: 'synth',
    disposed: false,
    unsubscribe: null,
  }

  const metricSampler = createAudioMetricSampler(ANALYSER_FFT_SIZE)
  const graphSession = createAudioGraphSession(initialAudioStack, {
    fftSize: ANALYSER_FFT_SIZE,
    rampMs: RAMP_MS,
    getContext: getAudioContext,
    isDisposed: () => state.disposed,
    applyInputMode: () => applyInputMode(),
    safeDisconnect,
  })
  const micController = createMicLifecycleController({
    fftSize: ANALYSER_FFT_SIZE,
    getContext: getAudioContext,
    getMixer: () => graphSession.getMixer(),
    isDisposed: () => state.disposed,
    onStatusChange: (status, error) => callbacks.onMicStatusChange?.(status, error),
    onStopped: metricSampler.resetMicHistory,
    sampleMicRms: metricSampler.sampleMicRms,
    safeDisconnect,
  })

  const applyInputMode = () => {
    const context = getAudioContext()
    if (!context) return
    const synthValue = state.inputMode === 'mic' ? 0 : state.inputMode === 'mix' ? 0.6 : 1
    graphSession.applySynthInputGain(synthValue, context.currentTime)
    micController.applyRoutingGain(state.inputMode, context.currentTime)
  }

  const initialize = async () => {
    const status = await startAudioContext()
    if (state.disposed || status !== 'on' || !graphSession.initialize()) return
    state.unsubscribe = addAudioContextListener((statusChange, error) =>
      callbacks.onStatusChange?.(statusChange, error),
    )
  }

  initialize().catch((error) => {
    callbacks.onStatusChange?.('error', error instanceof Error ? error.message : String(error))
  })

  return createAudioEngineControl({
    state,
    graphSession,
    metricSampler,
    micController,
    applyInputMode,
  })
}
