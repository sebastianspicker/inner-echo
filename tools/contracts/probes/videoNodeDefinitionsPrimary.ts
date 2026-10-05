import {
  ChromaAberrationNode,
  ColorGradeNode,
  EdgeSharpenNode,
  GrainNode,
  HazeNode,
  InterferenceNode,
  PulseNode,
  SoftBlurNode,
  TemporalSmearNode,
  VignetteNode,
} from '../../../src/runtime/visual/effects'
import type { ContractNodeDefinition, ProbeHarness } from './types'
import { numberParam } from './nodeRegistry'
import { millisecondsParam, pulseParams } from './videoNodeParamDefinitions'
import { VideoProbeHarness } from './videoProbeHarness'

export const PRIMARY_VIDEO_NODE_DEFINITIONS: ContractNodeDefinition[] = [
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
      speed: numberParam('node.speed', {
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
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0.02,
        min: 0,
        max: 0.5,
        safeModeClampKey: 'max_chroma',
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new ChromaAberrationNode()),
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
      temperature: numberParam('node.material.uniforms.u_temperature.value', {
        defaultValue: 0,
        min: -1,
        max: 1,
      }),
      tint: numberParam('node.material.uniforms.u_tint.value', {
        defaultValue: 0,
        min: -1,
        max: 1,
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
        max: 0.4,
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
        max: 1,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new EdgeSharpenNode()),
  },
  {
    kind: 'video',
    node: 'pulse',
    params: pulseParams(0.9),
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
      burst_duration_ms: millisecondsParam('node.burstDuration', {
        defaultValue: 180,
        min: 120,
        max: 500,
      }),
      burst_min_gap_ms: millisecondsParam('node.burstMinGap', {
        defaultValue: 600,
        min: 350,
        max: 3000,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new InterferenceNode()),
  },
]
