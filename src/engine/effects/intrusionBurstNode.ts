/**
 * SSOT: intrusion_burst: sparse short high-presence fragments.
 * Params: amount, burst_probability, burst_duration_ms, burst_min_gap_ms, initial_delay_ms, zoom, band_count.
 */

import { ShaderMaterial, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
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
uniform float u_burst;
uniform float u_zoom;
uniform float u_band_count;
uniform float u_time;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 base = texture2D(u_map, uv);

  vec2 center = vec2(0.5, 0.5);
  vec2 zoomUv = center + (vUv - center) * (1.0 - u_zoom * 0.18);
  zoomUv = zoomUv * u_uvScale + u_uvOffset;
  vec3 zoomColor = texture2D(u_map, zoomUv).rgb;
  zoomColor = clamp((zoomColor - 0.5) * 1.35 + 0.5, 0.0, 1.0);

  float vertical = 1.0 - smoothstep(0.08, 0.22, abs(vUv.x - 0.5));
  float bands = step(0.68, fract(vUv.y * max(1.0, u_band_count) + u_time * 0.7));
  float side = 1.0 - smoothstep(0.12, 0.32, abs(vUv.x - 0.78));
  float mask = clamp(max(vertical, bands * side) * u_burst * u_amount, 0.0, 1.0);

  vec3 color = mix(base.rgb, zoomColor, mask);
  color += mask * 0.04;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), base.a);
}
`

export class IntrusionBurstNode extends BurstEnvelopeState implements VideoNode {
  readonly nodeName = 'intrusion_burst'
  private material: ShaderMaterial | null = null
  private time = 0
  private initialDelay = 0.25
  private configuredInitialDelay = 0.25
  private firstBurstPending = true

  constructor() {
    super(0.32, 0.8)
  }

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    const probability = resolveNumberParam(params, 'burst_probability', 0)
    const durationMs = resolveNumberParam(params, 'burst_duration_ms', 320)
    const minGapMs = resolveNumberParam(params, 'burst_min_gap_ms', 800)
    const initialDelayMs = resolveNumberParam(params, 'initial_delay_ms', 250)
    const zoom = resolveNumberParam(params, 'zoom', 0.5)
    const bandCount = resolveNumberParam(params, 'band_count', 4)

    const globalMax = getGlobalClampNumber(params, 'max_luminance_delta_per_frame', 0.25)
    amount = clamp(amount, 0, Math.min(0.26, globalMax))
    if (params.safeMode) {
      const maxIntensity = getSafeModeClampNumber(params, 'max_intensity', 1)
      amount = Math.min(amount, 0.18 * clamp(maxIntensity, 0, 1))
    }

    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_zoom.value = clamp(zoom, 0, 1)
    this.material.uniforms.u_band_count.value = clamp(bandCount, 1, 9)
    this.material.uniforms.u_time.value = this.time
    this.burstProbPerSec = clamp(probability, 0, 1.2)
    this.burstDuration = clamp(durationMs / 1000, 0.18, 0.5)
    this.burstMinGap = clamp(minGapMs / 1000, 0.45, 3)
    const nextInitialDelay = clamp(initialDelayMs / 1000, 0, 2)
    if (this.firstBurstPending && nextInitialDelay !== this.configuredInitialDelay) {
      this.initialDelay = nextInitialDelay
    }
    this.configuredInitialDelay = nextInitialDelay

    applyUvParams(this.material, params)
  }

  tick(delta: number): void {
    if (!this.material) return
    this.time = (this.time + delta) % 1000
    this.material.uniforms.u_time.value = this.time

    if (this.firstBurstPending) {
      this.initialDelay -= delta
      if (this.initialDelay <= 0) {
        this.firstBurstPending = false
        this.burstTimer = this.burstDuration
      }
    }

    this.material.uniforms.u_burst.value = this.tickBurstEnvelope(delta)
  }

  getMaterial(inputTexture: Texture): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, FRAG, {
        u_amount: { value: 0 },
        u_burst: { value: 0 },
        u_zoom: { value: 0.5 },
        u_band_count: { value: 4 },
        u_time: { value: 0 },
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
