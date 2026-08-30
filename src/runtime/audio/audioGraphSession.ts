import type { AudioStackConfig } from '../../domain/experience/schema'
import { clamp01 } from '../../shared/numbers'
import { isKnownAudioNodeType, rampGain } from './audioGraphBuilder'
import { configureOutputRouting } from './outputRouting'
import { getAudioContextTime, getAudioStackTargetVolume } from './audioStackValues'
import { createSynth } from './synth'
import type { AudioModule } from './types'

type AudioGraphSessionOptions = {
  fftSize: number
  rampMs: number
  getContext: () => AudioContext | null
  isDisposed: () => boolean
  applyInputMode: () => void
  safeDisconnect: (node: AudioNode | null) => void
}

/** Owns one engine instance's retained stack, nodes, switching, and disposal. */
class AudioGraphSession {
  private masterGain: GainNode | null = null
  private analyserNode: AnalyserNode | null = null
  private mixer: GainNode | null = null
  private synthGain: GainNode | null = null
  private synthModule: ReturnType<typeof createSynth> | null = null
  private chain: AudioModule[] = []
  private activeChainNodes: string[] = []
  private switchTimeoutId: ReturnType<typeof setTimeout> | null = null
  private desiredAudioStack: AudioStackConfig | null | undefined

  constructor(
    initialAudioStack: AudioStackConfig | null | undefined,
    private readonly options: AudioGraphSessionOptions,
  ) {
    this.desiredAudioStack = initialAudioStack
  }

  initialize(): boolean {
    const context = this.options.getContext()
    if (!context) return false
    this.masterGain = context.createGain()
    this.masterGain.gain.value = this.desiredAudioStack?.master?.volume ?? 0.22
    this.masterGain.connect(context.destination)
    this.mixer = context.createGain()
    this.mixer.gain.value = 1
    this.synthGain = context.createGain()
    this.synthGain.gain.value = 1
    this.buildAndConnect(this.desiredAudioStack)
    return true
  }

  setConditionAudio(audioStack: AudioStackConfig | null | undefined) {
    if (this.options.isDisposed()) return
    this.desiredAudioStack = audioStack
    if (!this.options.getContext() || !this.masterGain) return
    this.cancelScheduledSwitch()
    const rampSec = this.options.rampMs / 1000
    rampGain(this.masterGain, 0, rampSec)
    const nextStack = this.desiredAudioStack
    this.switchTimeoutId = setTimeout(
      () => this.finishConditionSwitch(nextStack, rampSec),
      this.options.rampMs,
    )
  }

  setMasterVolume(value: number) {
    this.masterGain?.gain.setValueAtTime(
      clamp01(value),
      this.options.getContext()?.currentTime ?? 0,
    )
  }

  applySynthInputGain(value: number, now: number) {
    this.synthGain?.gain.cancelScheduledValues(now)
    this.synthGain?.gain.setValueAtTime(value, now)
  }

  applyReactiveParams(overrides: Record<string, number>) {
    if (!overrides || !this.chain.length) return
    for (const [key, value] of Object.entries(overrides)) {
      const parts = key.split('.')
      if (!key.startsWith('audio.') || parts.length < 3) continue
      const module = this.chain[Number(parts[1])]
      if (!module || !Number.isFinite(value)) continue
      module.setParams({ [parts.slice(2).join('.')]: value })
    }
  }

  getAnalyser() {
    return this.analyserNode
  }

  getMixer() {
    return this.mixer
  }

  getActiveNodes() {
    return this.activeChainNodes.slice()
  }

  cancelScheduledSwitch() {
    if (this.switchTimeoutId) {
      clearTimeout(this.switchTimeoutId)
      this.switchTimeoutId = null
    }
  }

  dispose() {
    this.cancelScheduledSwitch()
    for (const module of this.chain) module.dispose()
    this.chain = []
    this.activeChainNodes = []
    this.synthModule?.dispose()
    this.synthModule = null
    this.options.safeDisconnect(this.analyserNode)
    this.analyserNode = null
    this.options.safeDisconnect(this.mixer)
    this.mixer = null
    this.options.safeDisconnect(this.synthGain)
    this.synthGain = null
    this.options.safeDisconnect(this.masterGain)
    this.masterGain = null
  }

  private resetRouting() {
    this.options.safeDisconnect(this.synthGain)
    this.options.safeDisconnect(this.mixer)
    this.options.safeDisconnect(this.analyserNode)
    for (const module of this.chain) module.dispose()
    this.chain = []
    this.synthModule?.dispose()
    this.synthModule = null
  }

  private buildAndConnect(audioStack: AudioStackConfig | null | undefined) {
    const context = this.options.getContext()
    if (!context || !this.masterGain || !this.mixer || !this.synthGain) return
    this.resetRouting()
    const enabled = audioStack?.enabled === true
    this.configureSynthRouting(context, audioStack ?? {}, enabled)
    this.configureOutput(context, audioStack ?? {}, enabled)
    this.options.applyInputMode()
  }

  private configureSynthRouting(
    context: AudioContext,
    audioStack: AudioStackConfig,
    enabled: boolean,
  ) {
    if (!this.synthGain || !this.mixer) return
    this.activeChainNodes = enabled
      ? (audioStack.chain ?? [])
          .map((definition) => String(definition.node ?? '').toLowerCase())
          .filter((nodeType) => isKnownAudioNodeType(nodeType))
      : []
    if (!enabled) {
      this.synthGain.gain.value = 0
      return
    }
    this.synthModule = createSynth(context, {})
    this.synthModule.connect(this.synthGain)
    this.synthGain.gain.value = 1
    this.synthGain.connect(this.mixer)
  }

  private configureOutput(context: AudioContext, audioStack: AudioStackConfig, enabled: boolean) {
    if (!this.masterGain || !this.mixer) return
    const configured = configureOutputRouting(
      context,
      audioStack,
      enabled,
      this.masterGain,
      this.mixer,
      this.analyserNode,
      this.options.fftSize,
    )
    this.analyserNode = configured.analyser
    this.chain = configured.chain
  }

  private finishConditionSwitch(nextStack: AudioStackConfig | null | undefined, rampSec: number) {
    if (this.options.isDisposed()) return
    this.switchTimeoutId = null
    this.buildAndConnect(nextStack)
    if (!this.masterGain) return
    const now = getAudioContextTime(this.options.getContext())
    this.masterGain.gain.setValueAtTime(0, now)
    this.masterGain.gain.linearRampToValueAtTime(
      getAudioStackTargetVolume(nextStack),
      now + rampSec,
    )
  }
}

/**
 * Creates an instance-private profile graph. Its desired stack is retained before
 * context startup so condition updates queued during startup are not lost.
 */
export function createAudioGraphSession(
  initialAudioStack: AudioStackConfig | null | undefined,
  options: AudioGraphSessionOptions,
) {
  return new AudioGraphSession(initialAudioStack, options)
}
