import { Texture } from 'three'
import {
  ChromaticAberrationNode,
  ColorGradeNode,
  EdgeSharpenNode,
  FeedbackLoopNode,
  FocusJitterNode,
  GrainNode,
  GridHintNode,
  HazeNode,
  InterferenceNode,
  PulseNode,
  SoftBlurNode,
  TemporalSmearNode,
  VignetteNode,
  type VideoNode,
} from '../engine/effects'
import type {
  ContractNodeDefinition,
  ContractParamMetadata,
  ProbeHarness,
  ProbeOptions,
  RegistryNodeSummary,
  SafetyContextShape,
} from './types'
import { getByPath } from './utils'

const DEFAULT_SAFETY_CONTEXT: SafetyContextShape = {
  global: {
    max_intensity: 1,
    max_chroma: 0.12,
    max_global_contrast: 0.25,
    max_feedback: 0.18,
    max_jitter: 0.06,
    max_pulse_depth: 0.18,
    max_flash_hz: 3,
    max_luminance_delta_per_frame: 0.25,
  },
  safeMode: {},
}

class VideoProbeHarness implements ProbeHarness {
  readonly node: VideoNode & Record<string, unknown>
  private readonly input = new Texture()
  private readonly previous = new Texture()

  constructor(factory: () => VideoNode) {
    this.node = factory() as VideoNode & Record<string, unknown>
    if (this.node.needsPreviousFrame) {
      this.node.getMaterial(this.input, this.previous)
    } else {
      this.node.getMaterial(this.input)
    }
    if (typeof this.node.time === 'number') {
      this.node.time = 1
    }
  }

  applyParam(paramKey: string, value: unknown, options?: ProbeOptions): void {
    const controlValues: Record<string, number | boolean | string> = {}
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
      controlValues[`0.${paramKey}`] = value
    }
    const safeMode = options?.safeMode === true
    this.node.setParams({
      intensity: options?.intensity ?? 1,
      safeMode,
      safetyContext: options?.safetyContext ?? DEFAULT_SAFETY_CONTEXT,
      controlValues,
      nodeIndex: 0,
      uvScale: [1, 1],
      uvOffset: [0, 0],
    })
  }

  readPath(path: string): unknown {
    return getByPath({ node: this.node }, path)
  }

  dispose(): void {
    this.node.dispose()
    this.input.dispose()
    this.previous.dispose()
  }
}

function numberParam(
  readPath: string,
  config: {
    defaultValue: number
    min?: number
    max?: number
    safeModeClampKey?: string
    probeLow?: number
    probeHigh?: number
    epsilon?: number
  },
): ContractParamMetadata {
  return {
    type: 'number',
    defaultValue: config.defaultValue,
    min: config.min,
    max: config.max,
    safeModeClampKey: config.safeModeClampKey,
    probeLow: config.probeLow,
    probeHigh: config.probeHigh,
    epsilon: config.epsilon,
    readEffective(harness: ProbeHarness): unknown {
      return (harness as VideoProbeHarness).readPath(readPath)
    },
  }
}

const VIDEO_NODE_DEFINITIONS: ContractNodeDefinition[] = [
  {
    kind: 'video',
    node: 'grain',
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0,
        min: 0,
        max: 0.5,
        safeModeClampKey: 'max_intensity',
      }),
      speed: numberParam('node.material.uniforms.u_time.value', {
        defaultValue: 0.08,
        min: 0,
        max: 0.2,
      }),
      scale: numberParam('node.material.uniforms.u_scale.value', {
        defaultValue: 1.2,
        min: 0.5,
        max: 3,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new GrainNode()),
  },
  {
    kind: 'video',
    node: 'vignette',
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0.3,
        min: 0,
        max: 0.6,
        safeModeClampKey: 'max_intensity',
      }),
      softness: numberParam('node.material.uniforms.u_softness.value', {
        defaultValue: 0.75,
        min: 0.01,
        max: 1,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new VignetteNode()),
  },
  {
    kind: 'video',
    node: 'chroma_aberration',
    aliases: ['chromatic_aberration'],
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0.02,
        min: 0,
        max: 0.5,
        safeModeClampKey: 'max_chroma',
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new ChromaticAberrationNode()),
  },
  {
    kind: 'video',
    node: 'temporal_smear',
    params: {
      feedback: numberParam('node.material.uniforms.u_feedback.value', {
        defaultValue: 0.5,
        min: 0,
        max: 1,
        safeModeClampKey: 'max_temporal_feedback',
      }),
      jitter: numberParam('node.material.uniforms.u_jitter.value.x', {
        defaultValue: 0,
        min: 0,
        max: 0.25,
        safeModeClampKey: 'max_jitter',
      }),
      decay: {
        type: 'number',
        defaultValue: 0.94,
        min: 0.85,
        max: 0.99,
        readEffective(harness: ProbeHarness): unknown {
          return (harness as VideoProbeHarness).readPath('node.material.uniforms.u_decay.value')
        },
      },
    },
    createHarness: () => new VideoProbeHarness(() => new TemporalSmearNode()),
  },
  {
    kind: 'video',
    node: 'color_grade',
    params: {
      contrast: numberParam('node.material.uniforms.u_contrast.value', {
        defaultValue: 0,
        min: -0.25,
        max: 0.25,
        safeModeClampKey: 'max_contrast',
      }),
      saturation: numberParam('node.material.uniforms.u_saturation.value', {
        defaultValue: 0,
        min: -0.7,
        max: 0.25,
      }),
      brightness: numberParam('node.material.uniforms.u_brightness.value', {
        defaultValue: 0,
        min: -0.12,
        max: 0.12,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new ColorGradeNode()),
  },
  {
    kind: 'video',
    node: 'haze',
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0,
        min: 0,
        max: 0.25,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new HazeNode()),
  },
  {
    kind: 'video',
    node: 'soft_blur',
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0,
        min: 0,
        max: 0.35,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new SoftBlurNode()),
  },
  {
    kind: 'video',
    node: 'edge_sharpen',
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0,
        min: 0,
        max: 0.2,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new EdgeSharpenNode()),
  },
  {
    kind: 'video',
    node: 'pulse',
    params: {
      depth: numberParam('node.material.uniforms.u_depth.value', {
        defaultValue: 0,
        min: 0,
        max: 1,
        safeModeClampKey: 'max_pulse_depth',
      }),
      rate: numberParam('node.rateHz', {
        defaultValue: 1,
        min: 0.05,
        max: 10,
        safeModeClampKey: 'max_flash_hz',
      }),
      smoothing: numberParam('node.smoothing', {
        defaultValue: 0.9,
        min: 0,
        max: 0.999,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new PulseNode()),
  },
  {
    kind: 'video',
    node: 'interference',
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0,
        min: 0,
        max: 0.2,
        safeModeClampKey: 'max_intensity',
      }),
      banding: numberParam('node.material.uniforms.u_banding.value', {
        defaultValue: 0.06,
        min: 0,
        max: 1,
      }),
      smoothing: numberParam('node.material.uniforms.u_smoothing.value', {
        defaultValue: 0.9,
        min: 0,
        max: 1,
      }),
      burst_probability: numberParam('node.burstProbPerSec', {
        defaultValue: 0,
        min: 0,
        max: 1,
      }),
      burst_duration_ms: {
        type: 'number',
        defaultValue: 180,
        min: 120,
        max: 500,
        readEffective(harness: ProbeHarness): unknown {
          const sec = (harness as VideoProbeHarness).readPath('node.burstDuration')
          return typeof sec === 'number' ? sec * 1000 : sec
        },
      },
      burst_min_gap_ms: {
        type: 'number',
        defaultValue: 600,
        min: 350,
        max: 3000,
        readEffective(harness: ProbeHarness): unknown {
          const sec = (harness as VideoProbeHarness).readPath('node.burstMinGap')
          return typeof sec === 'number' ? sec * 1000 : sec
        },
      },
    },
    createHarness: () => new VideoProbeHarness(() => new InterferenceNode()),
  },
  {
    kind: 'video',
    node: 'focus_jitter',
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0,
        min: 0,
        max: 0.2,
        safeModeClampKey: 'max_jitter',
      }),
      smoothing: numberParam('node.material.uniforms.u_smoothing.value', {
        defaultValue: 0.92,
        min: 0,
        max: 0.999,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new FocusJitterNode()),
  },
  {
    kind: 'video',
    node: 'feedback_loop',
    params: {
      feedback: numberParam('node.material.uniforms.u_feedback.value', {
        defaultValue: 0,
        min: 0,
        max: 1,
        safeModeClampKey: 'max_feedback',
      }),
      decay: numberParam('node.material.uniforms.u_decay.value', {
        defaultValue: 0.94,
        min: 0.85,
        max: 0.99,
      }),
      jitter: numberParam('node.material.uniforms.u_jitter.value.x', {
        defaultValue: 0,
        min: 0,
        max: 0.25,
        safeModeClampKey: 'max_jitter',
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new FeedbackLoopNode()),
  },
  {
    kind: 'video',
    node: 'grid_hint',
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0,
        min: 0,
        max: 0.1,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new GridHintNode()),
  },
]

export const videoNodeDefinitions: ContractNodeDefinition[] = VIDEO_NODE_DEFINITIONS

export function buildVideoNodeLookup(): Map<string, ContractNodeDefinition> {
  const map = new Map<string, ContractNodeDefinition>()
  for (const def of videoNodeDefinitions) {
    map.set(def.node, def)
    for (const alias of def.aliases ?? []) map.set(alias, def)
  }
  return map
}

export function getVideoRegistrySummaries(): RegistryNodeSummary[] {
  return videoNodeDefinitions.map((def) => {
    const params: RegistryNodeSummary['params'] = {}
    for (const [key, meta] of Object.entries(def.params)) {
      params[key] = {
        type: meta.type,
        defaultValue: meta.defaultValue,
        min: meta.min,
        max: meta.max,
        enumValues: meta.enumValues,
        safeModeClampKey: meta.safeModeClampKey,
      }
    }
    return {
      kind: 'video',
      node: def.node,
      aliases: [...(def.aliases ?? [])],
      params,
    }
  })
}
