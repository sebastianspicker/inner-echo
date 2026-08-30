import type { AudioModule } from '../types'

interface RoutedAudioModuleOptions {
  input: AudioNode
  output: AudioNode
  setParams(params: Record<string, unknown>): void
  dispose(): void
}

export function createRoutedAudioModule(options: RoutedAudioModuleOptions): AudioModule {
  return {
    connect: (destination) => options.output.connect(destination),
    getInput: () => options.input,
    setParams: options.setParams,
    dispose: options.dispose,
  }
}
