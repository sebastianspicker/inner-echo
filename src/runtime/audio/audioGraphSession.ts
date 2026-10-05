import { scaleAudioParams } from '../../domain/experience/audioIntensity'
import type { AudioStackConfig } from '../../domain/experience/schema'
import { clamp01 } from '../../shared/numbers'
import { canonicalJson } from '../../shared/canonicalJson'
import { createOutputGuard } from './outputGuard'
import { isKnownAudioNodeType, rampGain } from './audioGraphBuilder'
import { configureOutputRouting } from './outputRouting'
import { getAudioContextTime, getAudioStackTargetVolume } from './audioStackValues'
import { createSynth } from './synth'
import type { AudioModule } from './types'

type AudioChainDefinition = NonNullable<AudioStackConfig['chain']>[number]

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
  private outputGuard: WaveShaperNode | null = null
  private analyserNode: AnalyserNode | null = null
  private mixer: GainNode | null = null
  private synthGain: GainNode | null = null
  private synthModule: ReturnType<typeof createSynth> | null = null
  private chain: AudioModule[] = []
  private chainDefinitions: AudioChainDefinition[] = []
  private intensity = 1
  private activeChainNodes: string[] = []
  private switchTimeoutId: ReturnType<typeof setTimeout> | null = null
  private desiredAudioStack: AudioStackConfig | null | undefined
  private desiredAudioKey: string | undefined
  private overriddenKeys = new Set<string>()

  constructor(
    initialAudioStack: AudioStackConfig | null | undefined,
    private readonly options: AudioGraphSessionOptions,
  ) {
    this.desiredAudioStack = initialAudioStack
    this.desiredAudioKey = canonicalJson(initialAudioStack)
  }

  initialize(): boolean {
    const context = this.options.getContext()
    if (!context) return false
    this.masterGain = context.createGain()
    this.masterGain.gain.value = this.desiredAudioStack?.master?.volume ?? 0.22
    this.outputGuard = createOutputGuard(context)
    this.masterGain.connect(this.outputGuard)
    this.outputGuard.connect(context.destination)
    this.mixer = context.createGain()
    this.mixer.gain.value = 1
    this.synthGain = context.createGain()
    this.synthGain.gain.value = 1
    this.buildAndConnect(this.desiredAudioStack)
    return true
  }

  setConditionAudio(audioStack: AudioStackConfig | null | undefined) {
    if (this.options.isDisposed()) return
    const key = canonicalJson(audioStack)
    if (key === this.desiredAudioKey) return
    this.desiredAudioKey = key
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
      Number.isFinite(value) ? clamp01(value) : 0,
      this.options.getContext()?.currentTime ?? 0,
    )
  }

  setIntensity(value: number) {
    const next = clamp01(value)
    if (next === this.intensity) return
    this.intensity = next
    this.applyIntensity()
  }

  applySynthInputGain(value: number, now: number) {
    this.synthGain?.gain.cancelScheduledValues(now)
    this.synthGain?.gain.setValueAtTime(value, now)
  }

  applyReactiveParams(overrides: Record<string, number>) {
    if (!overrides || !this.chain.length) return
    this.restoreWithdrawnOverrides(overrides)
    for (const [key, value] of Object.entries(overrides)) {
      const parts = key.split('.')
      if (!key.startsWith('audio.') || parts.length < 3) continue
      const module = this.chain[Number(parts[1])]
      if (!module || !Number.isFinite(value)) continue
      module.setParams({ [parts.slice(2).join('.')]: value })
      this.overriddenKeys.add(key)
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
    this.chainDefinitions = []
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
    this.options.safeDisconnect(this.outputGuard)
    this.outputGuard = null
    this.overriddenKeys.clear()
  }

  private resetRouting() {
    this.overriddenKeys.clear()
    this.options.safeDisconnect(this.synthGain)
    this.options.safeDisconnect(this.mixer)
    this.options.safeDisconnect(this.analyserNode)
    for (const module of this.chain) module.dispose()
    this.chain = []
    this.chainDefinitions = []
    this.synthModule?.dispose()
    this.synthModule = null
  }

  private restoreWithdrawnOverrides(overrides: Record<string, number>) {
    // A record replaces the previous modulation, including values from old
    // presets whose base parameters were supplied by module defaults.
    const withdrawnModules = new Set<number>()
    for (const key of this.overriddenKeys) {
      if (!Number.isFinite(overrides[key])) withdrawnModules.add(Number(key.split('.')[1]))
    }
    for (const index of withdrawnModules) {
      this.chain[index]?.resetParams?.()
      this.applyIntensityToModule(index)
    }
    this.overriddenKeys.clear()
  }

  private buildAndConnect(audioStack: AudioStackConfig | null | undefined) {
    const context = this.options.getContext()
    if (!context || !this.masterGain || !this.mixer || !this.synthGain) return
    this.resetRouting()
    const enabled = audioStack?.enabled === true
    this.configureSynthRouting(context, audioStack ?? {}, enabled)
    this.configureOutput(context, audioStack ?? {}, enabled)
    this.options.applyInputMode()
    this.applyIntensity()
  }

  private applyIntensity() {
    for (let index = 0; index < this.chain.length; index += 1) this.applyIntensityToModule(index)
  }

  private applyIntensityToModule(index: number) {
    const module = this.chain[index]
    const definition = this.chainDefinitions[index]
    if (!module || !definition) return
    const node = String(definition.node ?? '').toLowerCase()
    module.setParams(scaleAudioParams(node, definition.params ?? {}, this.intensity))
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
    this.synthModule = createSynth(context, audioStack.synth ?? {})
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
    this.chainDefinitions = enabled
      ? (audioStack.chain ?? []).filter(
          (definition) =>
            typeof definition.node === 'string' && isKnownAudioNodeType(definition.node),
        )
      : []
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
