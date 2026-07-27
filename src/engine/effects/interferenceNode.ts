/**
 * SSOT: interference: abstract, non-strobing interference / banding with optional micro-bursts.
 *
 * Params:
 * - amount
 * - banding
 * - smoothing
 * - burst_probability
 * - burst_duration_ms
 * - burst_min_gap_ms
 */

import { ShaderMaterial, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { fastRandom, type FastRandom } from '../../utils/fastRandom'
import {
  applyUvParams,
  clamp,
  getGlobalClampNumber,
  getSafeModeClampNumber,
  resolveNumberParam,
} from './paramUtils'
import { BurstEnvelopeState } from './burstEnvelope'
import { bindInputTexture, createEffectMaterial, disposeEffectMaterial } from './shaderMaterial'

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

  // Horizontal bands + subtle static grain; time term is smoothed (slow).
  float bandFreq = mix(6.0, 18.0, clamp(u_banding, 0.0, 1.0));
  float t = u_time * mix(0.15, 0.55, 1.0 - u_smoothing);
  float band = sin((uv.y * bandFreq + t) * 6.2831853) * 0.5 + 0.5;
  float n = hash(vec2(uv.y * 93.7, uv.x * 17.3)) - 0.5;

  float strength = u_amount * (0.65 + 0.35 * u_burst);
  float lift = (band - 0.5) * 0.46 * strength + n * 0.16 * strength;
  color.rgb += lift;

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class InterferenceNode extends BurstEnvelopeState implements VideoNode {
  readonly nodeName = 'interference'
  private material: ShaderMaterial | null = null
  private time = 0

  constructor(random: FastRandom = fastRandom) {
    super(0.18, 0.6, random)
  }

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    const banding = resolveNumberParam(params, 'banding', 0.06)
    const smoothing = resolveNumberParam(params, 'smoothing', 0.9)
    const burstProbability = resolveNumberParam(params, 'burst_probability', 0)
    const burstDurationMs = resolveNumberParam(params, 'burst_duration_ms', 180)
    const burstMinGapMs = resolveNumberParam(params, 'burst_min_gap_ms', 600)

    const globalMax = getGlobalClampNumber(params, 'max_luminance_delta_per_frame', 0.25)
    // Keep interference strength conservative regardless; SSOT profiles keep it low.
    // Use the global luminance delta clamp as a soft cap: prevent "spiky" changes in burst.
    amount = clamp(amount, 0, Math.min(0.2, globalMax))
    if (params.safeMode) {
      const maxIntensity = getSafeModeClampNumber(params, 'max_intensity', 1)
      amount = Math.min(amount, 0.2 * clamp(maxIntensity, 0, 1))
    }

    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_banding.value = clamp(banding, 0, 1)
    this.material.uniforms.u_smoothing.value = clamp(smoothing, 0, 1)
    this.material.uniforms.u_time.value = this.time

    // Burst scheduling params (kept conservative + non-strobing).
    this.burstProbPerSec = clamp(burstProbability, 0, 1)
    this.burstDuration = clamp(burstDurationMs / 1000, 0.12, 0.5)
    this.burstMinGap = clamp(burstMinGapMs / 1000, 0.35, 3)

    applyUvParams(this.material, params)
  }

  tick(delta: number): void {
    if (!this.material) return
    this.time = (this.time + delta) % 1000

    this.material.uniforms.u_burst.value = this.tickBurstEnvelope(delta)
  }

  getMaterial(inputTexture: Texture): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, FRAG, {
        u_amount: { value: 0 },
        u_banding: { value: 0.06 },
        u_smoothing: { value: 0.9 },
        u_time: { value: 0 },
        u_burst: { value: 0 },
      })
    } else {
      bindInputTexture(this.material, inputTexture)
    }
    return this.material
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
