/**
 * Interference: an abstract, restrained texture for intrusion. Soft horizontal bands drift
 * slowly across the frame over a faint line static; a sparse, eased micro-burst briefly
 * thickens the static and lifts the bands, then dissipates. Never strobes: burst envelopes
 * are at least 120 ms long and separated by a minimum gap.
 *
 * Params: amount, banding, smoothing, burst_probability, burst_duration_ms, burst_min_gap_ms.
 */

import type { VideoNode, VideoNodeParams } from './VideoNode'
import { fastRandom, type FastRandom } from './random'
import { clamp, resolveNumberParam } from './paramUtils'
import { BurstShaderNode } from './burstShaderNode'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
uniform float u_banding;
uniform float u_smoothing;
uniform float u_time;
uniform float u_burst;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 color = texture2D(u_map, uv);

  // Slow drifting bands; smoothing slows the drift further.
  float bandFreq = mix(4.0, 14.0, clamp(u_banding, 0.0, 1.0));
  float t = u_time * mix(0.08, 0.3, 1.0 - u_smoothing);
  float band = sin((vUv.y * bandFreq + t) * 6.2831853);

  // Faint line static, re-seeded 3 times per second (mean luminance unchanged).
  float seed = floor(u_time * 3.0);
  float stat = hash(vec2(floor(vUv.y * 240.0) + seed * 0.37, floor(vUv.x * 6.0) + seed)) - 0.5;

  float strength = u_amount * (0.6 + 0.4 * u_burst);
  float lift = band * 0.3 * strength + stat * 0.35 * strength * (0.4 + 0.6 * u_burst);
  color.rgb += lift;

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class InterferenceNode extends BurstShaderNode implements VideoNode {
  readonly nodeName = 'interference'

  constructor(random: FastRandom = fastRandom) {
    super(
      0.18,
      0.6,
      {
        fragmentShader: FRAG,
        uniforms: () => ({
          u_amount: { value: 0 },
          u_banding: { value: 0.06 },
          u_smoothing: { value: 0.9 },
          u_time: { value: 0 },
          u_burst: { value: 0 },
        }),
        syncTimeUniform: false,
        burstPolicy: {
          amountCap: 0.2,
          safeModeAmountFactor: 0.2,
          probability: { fallback: 0, min: 0, max: 1 },
          durationMs: { fallback: 180, min: 120, max: 500 },
          minGapMs: { fallback: 600, min: 350, max: 3000 },
        },
      },
      random,
    )
  }

  setParams(params: VideoNodeParams): void {
    const material = this.applyBurstShaderParams(params)
    if (!material) return
    const banding = resolveNumberParam(params, 'banding', 0.06)
    const smoothing = resolveNumberParam(params, 'smoothing', 0.9)

    material.uniforms.u_banding.value = clamp(banding, 0, 1)
    material.uniforms.u_smoothing.value = clamp(smoothing, 0, 1)
  }
}
