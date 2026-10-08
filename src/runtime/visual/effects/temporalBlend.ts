import type { VideoNodeParams } from './VideoNode'
import { HASH_GLSL, TEMPORAL_DITHER_GLSL } from './shaderKernels'
import {
  clamp,
  getGlobalClampNumber,
  getSafeModeClampNumber,
  resolveNumberParam,
} from './paramUtils'

/**
 * The `feedback` value that maps to a node's longest persistence time constant. It equals
 * the global `max_feedback` clamp, so the clamp still bounds how long an afterimage lingers.
 */
export const FEEDBACK_REFERENCE = 0.18

/** Hard ceiling on how long any retained image may linger, recurrence included. */
export const MAX_PERSISTENCE_SECONDS = 1.2

export const TEMPORAL_BLEND_FRAGMENT = `
uniform sampler2D u_map;
uniform sampler2D u_prev;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_blend;
uniform vec2 u_jitter;
uniform float u_dither;
uniform float u_time;
varying vec2 vUv;

${HASH_GLSL}${TEMPORAL_DITHER_GLSL}
void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 curr = texture2D(u_map, uv);
  vec4 prev = texture2D(u_prev, vUv + u_jitter);
  vec4 color = mix(curr, prev, u_blend);
  color.rgb += ieDither(vUv, u_time) * u_dither;
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

/**
 * Persistence time constant in seconds: `feedback` at the reference value lingers for
 * `tauMaxSeconds`; `decay` 0.85..0.99 scales that window from half to one and a half.
 */
export function persistenceSeconds(feedback: number, decay: number, tauMaxSeconds: number): number {
  if (feedback <= 0) return 0
  const decayFactor = 0.5 + ((clamp(decay, 0.85, 0.99) - 0.85) / 0.14) * 1
  return Math.min(
    MAX_PERSISTENCE_SECONDS,
    (feedback / FEEDBACK_REFERENCE) * tauMaxSeconds * decayFactor,
  )
}

/** Frame-rate-independent blend weight for the previous frame. */
export function persistenceBlend(tauSeconds: number, delta: number): number {
  if (tauSeconds <= 0 || delta <= 0) return 0
  return clamp(Math.exp(-delta / tauSeconds), 0, 0.995)
}

/**
 * Slow recurrence wave for the feedback loop: every `periodSeconds` the retained image is
 * held longer for about two seconds, then released, so the past keeps resurfacing.
 */
export function recurrenceWave(time: number, periodSeconds: number): number {
  const phase = ((time % periodSeconds) + periodSeconds) % periodSeconds
  const rise = clamp(phase / 1.2, 0, 1)
  const fall = 1 - clamp((phase - 2) / 2, 0, 1)
  const smooth = (x: number) => x * x * (3 - 2 * x)
  return smooth(rise) * smooth(fall)
}
