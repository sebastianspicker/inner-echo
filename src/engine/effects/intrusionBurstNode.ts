/**
 * SSOT: intrusion_burst: sparse short high-presence fragments.
 * Params: amount, burst_probability, burst_duration_ms, burst_min_gap_ms, initial_delay_ms, zoom, band_count.
 */

import type { VideoNode, VideoNodeParams } from './VideoNode'
import { clamp, resolveNumberParam } from './paramUtils'
import { BurstShaderNode } from './burstShaderNode'

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

export class IntrusionBurstNode extends BurstShaderNode implements VideoNode {
  readonly nodeName = 'intrusion_burst'
  private initialDelay = 0.25
  private configuredInitialDelay = 0.25
  private firstBurstPending = true

  constructor() {
    super(0.32, 0.8, {
      fragmentShader: FRAG,
      uniforms: () => ({
        u_amount: { value: 0 },
        u_burst: { value: 0 },
        u_zoom: { value: 0.5 },
        u_band_count: { value: 4 },
        u_time: { value: 0 },
      }),
      syncTimeUniform: true,
      burstPolicy: {
        amountCap: 0.26,
        safeModeAmountFactor: 0.18,
        probability: { fallback: 0, min: 0, max: 1.2 },
        durationMs: { fallback: 320, min: 180, max: 500 },
        minGapMs: { fallback: 800, min: 450, max: 3000 },
      },
    })
  }

  setParams(params: VideoNodeParams): void {
    const material = this.applyBurstShaderParams(params)
    if (!material) return
    const initialDelayMs = resolveNumberParam(params, 'initial_delay_ms', 250)
    const zoom = resolveNumberParam(params, 'zoom', 0.5)
    const bandCount = resolveNumberParam(params, 'band_count', 4)

    material.uniforms.u_zoom.value = clamp(zoom, 0, 1)
    material.uniforms.u_band_count.value = clamp(bandCount, 1, 9)
    const nextInitialDelay = clamp(initialDelayMs / 1000, 0, 2)
    if (this.firstBurstPending && nextInitialDelay !== this.configuredInitialDelay) {
      this.initialDelay = nextInitialDelay
    }
    this.configuredInitialDelay = nextInitialDelay
  }

  protected override beforeTickBurstEnvelope(delta: number): void {
    if (this.firstBurstPending) {
      this.initialDelay -= delta
      if (this.initialDelay <= 0) {
        this.firstBurstPending = false
        this.burstTimer = this.burstDuration
      }
    }
  }
}
