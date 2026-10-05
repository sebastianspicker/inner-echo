import {
  FeedbackLoopNode,
  FocusJitterNode,
  GazeTunnelNode,
  GlassVeilNode,
  GridHintNode,
  IntrusionBurstNode,
  SalienceCompetitionNode,
  SomaticPulseNode,
} from '../../../src/runtime/visual/effects'
import type { ContractNodeDefinition } from './types'
import { numberParam } from './nodeRegistry'
import { millisecondsParam, pulseParams } from './videoNodeParamDefinitions'
import { VideoProbeHarness } from './videoProbeHarness'

export const SECONDARY_VIDEO_NODE_DEFINITIONS: ContractNodeDefinition[] = [
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
  {
    kind: 'video',
    node: 'gaze_tunnel',
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0,
        min: 0,
        max: 0.85,
        safeModeClampKey: 'max_intensity',
      }),
      radius: numberParam('node.material.uniforms.u_radius.value', {
        defaultValue: 0.42,
        min: 0.18,
        max: 0.75,
      }),
      edge_gain: numberParam('node.material.uniforms.u_edge_gain.value', {
        defaultValue: 0.3,
        min: 0,
        max: 1,
      }),
      desaturate: numberParam('node.material.uniforms.u_desaturate.value', {
        defaultValue: 0.3,
        min: 0,
        max: 0.7,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new GazeTunnelNode()),
  },
  {
    kind: 'video',
    node: 'somatic_pulse',
    params: {
      ...pulseParams(0.85),
      tunnel: numberParam('node.material.uniforms.u_tunnel.value', {
        defaultValue: 0.3,
        min: 0,
        max: 0.75,
      }),
      blur: numberParam('node.material.uniforms.u_blur.value', {
        defaultValue: 0.12,
        min: 0,
        max: 0.35,
      }),
      surge: numberParam('node.surgeStrength', {
        defaultValue: 0,
        min: 0,
        max: 1,
      }),
      surge_interval: numberParam('node.surgeIntervalSec', {
        defaultValue: 12,
        min: 4,
        max: 30,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new SomaticPulseNode()),
  },
  {
    kind: 'video',
    node: 'intrusion_burst',
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0,
        min: 0,
        max: 0.26,
        safeModeClampKey: 'max_luminance_delta_per_frame',
      }),
      burst_probability: numberParam('node.burstProbPerSec', {
        defaultValue: 0,
        min: 0,
        max: 1.2,
      }),
      burst_duration_ms: millisecondsParam('node.burstDuration', {
        defaultValue: 320,
        min: 180,
        max: 500,
      }),
      burst_min_gap_ms: millisecondsParam('node.burstMinGap', {
        defaultValue: 800,
        min: 450,
        max: 3000,
      }),
      initial_delay_ms: millisecondsParam('node.initialDelay', {
        defaultValue: 250,
        min: 0,
        max: 2000,
      }),
      zoom: numberParam('node.material.uniforms.u_zoom.value', {
        defaultValue: 0.5,
        min: 0,
        max: 1,
      }),
      band_count: numberParam('node.material.uniforms.u_band_count.value', {
        defaultValue: 4,
        min: 1,
        max: 9,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new IntrusionBurstNode()),
  },
  {
    kind: 'video',
    node: 'salience_competition',
    params: {
      amount: numberParam('node.material.uniforms.u_amount.value', {
        defaultValue: 0,
        min: 0,
        max: 1,
        safeModeClampKey: 'max_intensity',
      }),
      marker_strength: numberParam('node.material.uniforms.u_marker_strength.value', {
        defaultValue: 0.5,
        min: 0,
        max: 1,
      }),
      shift: numberParam('node.material.uniforms.u_shift.value', {
        defaultValue: 0.03,
        min: 0,
        max: 0.08,
        safeModeClampKey: 'max_jitter',
      }),
      jump_rate: numberParam('node.jumpRate', {
        defaultValue: 1.2,
        min: 0.1,
        max: 3,
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new SalienceCompetitionNode()),
  },
  {
    kind: 'video',
    node: 'glass_veil',
    params: {
      veil: numberParam('node.material.uniforms.u_veil.value', {
        defaultValue: 0,
        min: 0,
        max: 1,
      }),
      feedback: numberParam('node.material.uniforms.u_feedback.value', {
        defaultValue: 0,
        min: 0,
        max: 0.35,
        safeModeClampKey: 'max_feedback',
      }),
      refraction: numberParam('node.material.uniforms.u_refraction.value', {
        defaultValue: 0,
        min: 0,
        max: 0.06,
      }),
      chroma: numberParam('node.material.uniforms.u_chroma.value', {
        defaultValue: 0,
        min: 0,
        max: 0.2,
        safeModeClampKey: 'max_chroma',
      }),
    },
    createHarness: () => new VideoProbeHarness(() => new GlassVeilNode()),
  },
]
