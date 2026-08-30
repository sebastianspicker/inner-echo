import type { VideoNodeParams } from './VideoNode'
import {
  clamp,
  getGlobalClampNumber,
  getSafeModeClampNumber,
  resolveNumberParam,
} from './paramUtils'

export const TEMPORAL_BLEND_FRAGMENT = `
uniform sampler2D u_map;
uniform sampler2D u_prev;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_feedback;
uniform float u_decay;
uniform vec2 u_jitter;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec2 juv = uv + u_jitter;
  vec4 curr = texture2D(u_map, uv);
  vec4 prev = texture2D(u_prev, juv);
  float w = clamp(u_feedback * u_decay, 0.0, 1.0);
  vec4 color = mix(curr, prev, w);
  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export interface TemporalBlendParameters {
  feedback: number
  jitter: number
  decay: number
}

/** Resolve the common temporal controls while preserving each node's safe-mode clamp key. */
export function resolveTemporalBlendParameters(
  params: VideoNodeParams,
  safeModeFeedbackKey: string,
): TemporalBlendParameters {
  const intensity = clamp(params.intensity ?? 0, 0, 1)
  let feedback = resolveNumberParam(params, 'feedback', 0) * intensity
  let jitter = resolveNumberParam(params, 'jitter', 0) * intensity
  const decay = clamp(resolveNumberParam(params, 'decay', 0.94), 0.85, 0.99)
  const globalMaxFeedback = getGlobalClampNumber(params, 'max_feedback', 0.18)
  const globalMaxJitter = getGlobalClampNumber(params, 'max_jitter', 0.06)

  feedback = clamp(feedback, 0, clamp(globalMaxFeedback, 0, 1))
  jitter = clamp(jitter, 0, clamp(globalMaxJitter, 0, 0.25))
  if (params.safeMode) {
    const maxFeedback = getSafeModeClampNumber(params, safeModeFeedbackKey, globalMaxFeedback)
    const maxJitter = getSafeModeClampNumber(params, 'max_jitter', globalMaxJitter)
    feedback = Math.min(feedback, clamp(maxFeedback, 0, 1))
    jitter = Math.min(jitter, clamp(maxJitter, 0, 0.25))
  }
  return { feedback, jitter, decay }
}
