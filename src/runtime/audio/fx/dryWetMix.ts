export interface DryWetMix {
  input: GainNode
  out: GainNode
  connectWetSource(wetSource: AudioNode): void
  setMix(mix: number): void
  dispose(): void
}

export function createDryWetMix(context: BaseAudioContext): DryWetMix {
  const input = context.createGain()
  input.gain.value = 1
  const dry = context.createGain()
  const wet = context.createGain()
  const out = context.createGain()

  return {
    input,
    out,
    connectWetSource(wetSource: AudioNode): void {
      input.connect(dry)
      input.connect(wetSource)
      wetSource.connect(wet)
      dry.connect(out)
      wet.connect(out)
    },
    setMix(mix: number): void {
      dry.gain.setValueAtTime(1 - mix, context.currentTime)
      wet.gain.setValueAtTime(mix, context.currentTime)
    },
    dispose(): void {
      input.disconnect()
      dry.disconnect()
      wet.disconnect()
      out.disconnect()
    },
  }
}
