import {
  createCompressor,
  createDelay,
  createFlutter,
  createHighpass,
  createLowpass,
  createNoiseBed,
  createPulseTone,
  createReverb,
  createTremolo,
} from '../engine/audio/fx'
import type { AudioModule } from '../engine/audio/types'
import { FakeAudioContext, type FakeAudioBuffer, hashBuffer } from './fakeAudioContext'
import type { ContractNodeDefinition, ContractParamMetadata, ProbeHarness } from './types'
import { buildNodeLookup, numberParam, summarizeNodeDefinitions } from './nodeRegistry'
import { getByPath, withSeededRandom } from './utils'

class AudioProbeHarness implements ProbeHarness {
  readonly context: FakeAudioContext
  readonly created: ReturnType<FakeAudioContext['collectSince']>
  private readonly module: AudioModule

  constructor(factory: (ctx: BaseAudioContext) => AudioModule) {
    this.context = new FakeAudioContext()
    const mark = this.context.mark()
    this.module = factory(this.context as unknown as BaseAudioContext)
    this.created = this.context.collectSince(mark)
  }

  applyParam(paramKey: string, value: unknown): void {
    const payload: Record<string, unknown> = { [paramKey]: value }
    if (paramKey === 'color') {
      withSeededRandom(17, () => {
        this.module.setParams(payload)
      })
      return
    }
    this.module.setParams(payload)
  }

  readPath(path: string): unknown {
    return getByPath({ context: this.context, created: this.created }, path)
  }

  dispose(): void {
    this.module.dispose()
  }
}

function biquadParams(cutoff: {
  defaultValue: number
  min: number
  max: number
}): Record<string, ContractParamMetadata> {
  return {
    cutoff: numberParam('created.biquads.0.frequency.value', cutoff),
    q: numberParam('created.biquads.0.Q.value', {
      defaultValue: 0.7,
      min: 0.5,
      max: 1.2,
    }),
  }
}

const AUDIO_NODE_DEFINITIONS: ContractNodeDefinition[] = [
  {
    kind: 'audio',
    node: 'lowpass',
    params: biquadParams({ defaultValue: 800, min: 300, max: 12000 }),
    createHarness: () => new AudioProbeHarness((ctx) => createLowpass(ctx, {})),
  },
  {
    kind: 'audio',
    node: 'highpass',
    params: biquadParams({ defaultValue: 160, min: 50, max: 500 }),
    createHarness: () => new AudioProbeHarness((ctx) => createHighpass(ctx, {})),
  },
  {
    kind: 'audio',
    node: 'tremolo',
    params: {
      rate: numberParam('created.oscillators.0.frequency.value', {
        defaultValue: 3,
        min: 0.1,
        max: 4,
        safeModeClampKey: 'max_tremolo_rate_hz',
      }),
      depth: {
        type: 'number',
        defaultValue: 0.15,
        min: 0,
        max: 0.15,
        safeModeClampKey: 'max_tremolo_depth',
        readEffective(harness: ProbeHarness): unknown {
          const v = (harness as AudioProbeHarness).readPath('created.gains.2.gain.value')
          return typeof v === 'number' ? -2 * v : v
        },
      },
    },
    createHarness: () => new AudioProbeHarness((ctx) => createTremolo(ctx, {})),
  },
  {
    kind: 'audio',
    node: 'flutter',
    params: {
      rate: numberParam('created.oscillators.0.frequency.value', {
        defaultValue: 0.55,
        min: 0.1,
        max: 1.2,
      }),
      depth: {
        type: 'number',
        defaultValue: 0.05,
        min: 0,
        max: 0.12,
        readEffective(harness: ProbeHarness): unknown {
          const v = (harness as AudioProbeHarness).readPath('created.gains.2.gain.value')
          return typeof v === 'number' ? v / 0.006 : v
        },
      },
    },
    createHarness: () => new AudioProbeHarness((ctx) => createFlutter(ctx, {})),
  },
  {
    kind: 'audio',
    node: 'noise_bed',
    params: {
      level: numberParam('created.gains.2.gain.value', {
        defaultValue: 0.03,
        min: 0,
        max: 0.08,
        safeModeClampKey: 'max_noise_level',
      }),
      color: {
        type: 'enum',
        defaultValue: 'pink',
        enumValues: ['white', 'pink', 'brown'],
        probeLow: 'white',
        probeHigh: 'brown',
        readEffective(harness: ProbeHarness): unknown {
          const buffer = (harness as AudioProbeHarness).readPath(
            'created.bufferSources.0.buffer',
          ) as FakeAudioBuffer | null | undefined
          return hashBuffer(buffer)
        },
      },
    },
    createHarness: () => new AudioProbeHarness((ctx) => createNoiseBed(ctx, {})),
  },
  {
    kind: 'audio',
    node: 'delay',
    params: {
      time: numberParam('created.delays.0.delayTime.value', {
        defaultValue: 0.14,
        min: 0.05,
        max: 0.35,
      }),
      feedback: numberParam('created.gains.4.gain.value', {
        defaultValue: 0.06,
        min: 0,
        max: 0.18,
      }),
      mix: numberParam('created.gains.2.gain.value', {
        defaultValue: 0.03,
        min: 0,
        max: 0.12,
      }),
    },
    createHarness: () => new AudioProbeHarness((ctx) => createDelay(ctx, {})),
  },
  {
    kind: 'audio',
    node: 'reverb',
    params: {
      mix: numberParam('created.gains.2.gain.value', {
        defaultValue: 0.05,
        min: 0,
        max: 0.12,
      }),
      decay: {
        type: 'number',
        defaultValue: 1.3,
        min: 0.6,
        max: 2.8,
        readEffective(harness: ProbeHarness): unknown {
          const h = harness as AudioProbeHarness
          const buffer = h.readPath('created.convolvers.0.buffer') as
            | FakeAudioBuffer
            | null
            | undefined
          if (!buffer) return 0
          return buffer.length / h.context.sampleRate
        },
      },
    },
    createHarness: () => new AudioProbeHarness((ctx) => createReverb(ctx, {})),
  },
  {
    kind: 'audio',
    node: 'pulse_tone',
    params: {
      rate: numberParam('created.oscillators.1.frequency.value', {
        defaultValue: 1,
        min: 0.2,
        max: 3,
      }),
      mix: {
        type: 'number',
        defaultValue: 0.06,
        min: 0,
        max: 0.12,
        readEffective(harness: ProbeHarness): unknown {
          const v = (harness as AudioProbeHarness).readPath(
            'created.constantSources.0.offset.value',
          )
          return typeof v === 'number' ? v * 2 : v
        },
      },
      base_freq: numberParam('created.oscillators.0.frequency.value', {
        defaultValue: 120,
        min: 60,
        max: 220,
      }),
    },
    createHarness: () => new AudioProbeHarness((ctx) => createPulseTone(ctx, {})),
  },
  {
    kind: 'audio',
    node: 'compressor_limiter',
    params: {
      threshold: numberParam('created.compressors.0.threshold.value', {
        defaultValue: -20,
        min: -40,
        max: -10,
      }),
      ratio: numberParam('created.compressors.0.ratio.value', {
        defaultValue: 3,
        min: 2,
        max: 12,
      }),
      attack: numberParam('created.compressors.0.attack.value', {
        defaultValue: 0.02,
        min: 0.001,
        max: 0.05,
      }),
      release: numberParam('created.compressors.0.release.value', {
        defaultValue: 0.25,
        min: 0.05,
        max: 0.6,
      }),
      ceiling: {
        type: 'number',
        defaultValue: -6,
        min: -24,
        max: -6,
        safeModeClampKey: 'audio_ceiling_dbfs',
        readEffective(harness: ProbeHarness): unknown {
          const g = (harness as AudioProbeHarness).readPath('created.gains.1.gain.value')
          if (typeof g !== 'number' || g <= 0) return -Infinity
          return 20 * Math.log10(g)
        },
      },
    },
    createHarness: () => new AudioProbeHarness((ctx) => createCompressor(ctx, {})),
  },
]

export const audioNodeDefinitions: ContractNodeDefinition[] = AUDIO_NODE_DEFINITIONS

export function buildAudioNodeLookup(): Map<string, ContractNodeDefinition> {
  return buildNodeLookup(audioNodeDefinitions)
}

export function getAudioRegistrySummaries() {
  return summarizeNodeDefinitions(audioNodeDefinitions)
}
