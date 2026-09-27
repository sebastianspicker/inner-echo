/**
 * Slow body-wave tunnel and blur pulse.
 * Params: depth, rate, smoothing, tunnel, blur.
 */

import type { ShaderMaterial, Material, Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams, clamp, resolveNumberParam } from './paramUtils'
import { getPulseMaterial, PulseEnvelope, resolvePulseParameters } from './pulseEffectSupport'
import { disposeEffectMaterial } from './shaderMaterial'

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
  private readonly envelope = new PulseEnvelope()
  private rateHz = 1
  private smoothing = 0.85

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    const resolved = resolvePulseParameters(params, 0.85)
    let tunnel = resolveNumberParam(params, 'tunnel', 0.3) * intensity
    let blur = resolveNumberParam(params, 'blur', 0.12) * intensity
    tunnel = clamp(tunnel, 0, 0.75)
    blur = clamp(blur, 0, 0.35)

    if (params.safeMode) {
      tunnel = Math.min(tunnel, 0.5)
      blur = Math.min(blur, 0.22)
    }

    this.material.uniforms.u_depth.value = resolved.depth
    this.material.uniforms.u_pulse.value = this.envelope.current()
    this.material.uniforms.u_tunnel.value = tunnel
    this.material.uniforms.u_blur.value = blur
    this.rateHz = resolved.rate
    this.smoothing = resolved.smoothing

    applyUvParams(this.material, params)
  }

  tick(delta: number): void {
    if (!this.material) return
    this.material.uniforms.u_pulse.value = this.envelope.advance(
      delta,
      this.rateHz,
      this.smoothing,
      { tauScale: 0.7, minTau: 0.03, maxTau: 0.7 },
    )
  }

  getMaterial(inputTexture: Texture): Material {
    this.material = getPulseMaterial(this.material, inputTexture, FRAG, {
      u_depth: { value: 0 },
      u_pulse: { value: 0.5 },
      u_tunnel: { value: 0.3 },
      u_blur: { value: 0.12 },
    })
    return this.material
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
