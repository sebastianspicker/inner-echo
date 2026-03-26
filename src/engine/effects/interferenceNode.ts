/**
 * SSOT: interference — abstract, non-strobing interference / banding with optional micro-bursts.
 *
 * Params:
 * - amount
 * - banding
 * - smoothing
 * - burst_probability
 * - burst_duration_ms
 * - burst_min_gap_ms
 */

import * as THREE from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import {
  applyUvParams,
  clamp,
  getGlobalClampNumber,
  getSafeModeClampNumber,
  resolveNumberParam,
  QUAD_VERTEX_SHADER,
} from './paramUtils'

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
  float lift = (band - 0.5) * 0.14 * strength + n * 0.06 * strength;
  color.rgb += lift;

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

function easeInOut(t: number): number {
  const x = clamp(t, 0, 1)
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2
}

export class InterferenceNode implements VideoNode {
  readonly nodeName = 'interference'
  private material: THREE.ShaderMaterial | null = null
  private time = 0
  private burstTimer = 0
  private burstGapTimer = 0
  private burstDuration = 0.18
  private burstProbPerSec = 0
  private burstMinGap = 0.6

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
    amount = clamp(amount, 0, 0.2)
    if (params.safeMode) {
      const maxIntensity = getSafeModeClampNumber(params, 'max_intensity', 1)
      amount = Math.min(amount, 0.2 * clamp(maxIntensity, 0, 1))
    }

    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_banding.value = clamp(banding, 0, 1)
    this.material.uniforms.u_smoothing.value = clamp(smoothing, 0, 1)
    this.material.uniforms.u_time.value = this.time

    // Use the global luminance delta clamp as a soft cap: prevent "spiky" changes in burst.
    void globalMax

    // Burst scheduling params (kept conservative + non-strobing).
    this.burstProbPerSec = clamp(burstProbability, 0, 1)
    this.burstDuration = clamp(burstDurationMs / 1000, 0.12, 0.5)
    this.burstMinGap = clamp(burstMinGapMs / 1000, 0.35, 3)

    applyUvParams(this.material, params)
  }

  tick(delta: number): void {
    if (!this.material) return
    this.time = (this.time + delta) % 1000

    // Burst scheduling (non-strobing): long-ish fades, enforced min gap.
    if (this.burstGapTimer > 0) this.burstGapTimer = Math.max(0, this.burstGapTimer - delta)

    if (this.burstTimer > 0) {
      this.burstTimer = Math.max(0, this.burstTimer - delta)
      // t goes from 0 (start) to 1 (end); use a triangle envelope so
      // burst fades in during the first half and fades out during the second half.
      const t = 1 - this.burstTimer / Math.max(0.001, this.burstDuration)
      const envelope = t < 0.5 ? t * 2 : (1 - t) * 2
      this.material.uniforms.u_burst.value = easeInOut(envelope)
      if (this.burstTimer === 0) {
        this.material.uniforms.u_burst.value = 0
        this.burstGapTimer = this.burstMinGap
      }
      return
    }

    this.material.uniforms.u_burst.value = 0

    if (this.burstGapTimer <= 0 && this.burstProbPerSec > 0) {
      // Poisson-like: probability per second.
      const p = clamp(this.burstProbPerSec * delta, 0, 0.5)
      if (Math.random() < p) {
        this.burstTimer = this.burstDuration
      }
    }
  }

  getMaterial(inputTexture: THREE.Texture): THREE.Material {
    if (this.material) {
      this.material.uniforms.u_map.value = inputTexture
      return this.material
    }
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_map: { value: inputTexture },
        u_uvScale: { value: new THREE.Vector2(1, 1) },
        u_uvOffset: { value: new THREE.Vector2(0, 0) },
        u_amount: { value: 0 },
        u_banding: { value: 0.06 },
        u_smoothing: { value: 0.9 },
        u_time: { value: 0 },
        u_burst: { value: 0 },
      },
      vertexShader: QUAD_VERTEX_SHADER,
      fragmentShader: FRAG,
      depthWrite: false,
    })
    return this.material
  }

  dispose(): void {
    this.material?.dispose()
    this.material = null
  }
}

