/**
 * SSOT: somatic_pulse — slow body-wave tunnel/blur pulse.
 * Params: depth, rate, smoothing, tunnel, blur.
 */

import { ShaderMaterial, Vector2, type Material, type Texture } from 'three'
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
uniform float u_depth;
uniform float u_pulse;
uniform float u_tunnel;
uniform float u_blur;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec2 center = vec2(0.5, 0.5);
  vec2 radial = vUv - center;
  float d = length(radial);
  float wave = (u_pulse - 0.5) * 2.0;
  float pulse = abs(wave) * u_depth;

  vec2 zoomUv = center + radial * (1.0 - wave * u_depth * 0.055);
  zoomUv = zoomUv * u_uvScale + u_uvOffset;
  vec2 blurDir = normalize(radial + vec2(0.0001)) * u_blur * pulse * 0.018;
  vec4 color = texture2D(u_map, zoomUv);
  color += texture2D(u_map, zoomUv + blurDir);
  color += texture2D(u_map, zoomUv - blurDir);
  color /= 3.0;

  float peripheral = smoothstep(0.26, 0.92, d);
  float tunnel = peripheral * u_tunnel * (0.65 + pulse);
  color.rgb *= 1.0 - tunnel * 0.5;
  color.rgb *= 1.0 + wave * u_depth * 0.24;

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class SomaticPulseNode implements VideoNode {
  readonly nodeName = 'somatic_pulse'
  private material: ShaderMaterial | null = null
  private phase = 0
  private smoothed = 0.5
  private rateHz = 1
  private smoothing = 0.85

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let depth = resolveNumberParam(params, 'depth', 0) * intensity
    let rate = resolveNumberParam(params, 'rate', 1)
    let tunnel = resolveNumberParam(params, 'tunnel', 0.3) * intensity
    let blur = resolveNumberParam(params, 'blur', 0.12) * intensity
    const smoothing = resolveNumberParam(params, 'smoothing', 0.85)

    const maxPulse = getGlobalClampNumber(params, 'max_pulse_depth', 0.18)
    const maxHz = getGlobalClampNumber(params, 'max_flash_hz', 3)
    depth = clamp(depth, 0, clamp(maxPulse, 0, 1))
    rate = clamp(rate, 0.05, clamp(maxHz, 0.1, 10))
    tunnel = clamp(tunnel, 0, 0.75)
    blur = clamp(blur, 0, 0.35)

    if (params.safeMode) {
      const safePulse = getSafeModeClampNumber(params, 'max_pulse_depth', maxPulse)
      const safeHz = getSafeModeClampNumber(params, 'max_flash_hz', maxHz)
      depth = Math.min(depth, clamp(safePulse, 0, 1))
      rate = Math.min(rate, clamp(safeHz, 0.1, 10))
      tunnel = Math.min(tunnel, 0.5)
      blur = Math.min(blur, 0.22)
    }

    this.material.uniforms.u_depth.value = depth
    this.material.uniforms.u_pulse.value = this.smoothed
    this.material.uniforms.u_tunnel.value = tunnel
    this.material.uniforms.u_blur.value = blur
    this.rateHz = rate
    this.smoothing = clamp(smoothing, 0, 0.999)

    applyUvParams(this.material, params)
  }

  tick(delta: number): void {
    if (!this.material) return
    this.phase = (this.phase + delta * this.rateHz * Math.PI * 2) % (Math.PI * 2)
    const target = Math.sin(this.phase) * 0.5 + 0.5
    const tau = clamp((1 - this.smoothing) * 0.7, 0.03, 0.7)
    const t = 1 - Math.exp(-delta / tau)
    this.smoothed += (target - this.smoothed) * t
    this.material.uniforms.u_pulse.value = this.smoothed
  }

  getMaterial(inputTexture: Texture): Material {
    if (this.material) {
      this.material.uniforms.u_map.value = inputTexture
      return this.material
    }
    this.material = new ShaderMaterial({
      uniforms: {
        u_map: { value: inputTexture },
        u_uvScale: { value: new Vector2(1, 1) },
        u_uvOffset: { value: new Vector2(0, 0) },
        u_depth: { value: 0 },
        u_pulse: { value: 0.5 },
        u_tunnel: { value: 0.3 },
        u_blur: { value: 0.12 },
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
