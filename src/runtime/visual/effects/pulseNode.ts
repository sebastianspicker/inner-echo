/**
 * Smooth, low-frequency pulse without strobing.
 * Params: depth, rate, smoothing.
 */

import type { ShaderMaterial, Material, Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams } from './paramUtils'
import { getPulseMaterial, PulseEnvelope, resolvePulseParameters } from './pulseEffectSupport'
import { disposeEffectMaterial } from './shaderMaterial'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_depth;
uniform float u_pulse;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 color = texture2D(u_map, uv);

  // Pulse is 0..1; center it around 0 with a gentle brightness modulation.
  float centered = (u_pulse - 0.5) * 2.0;
  float gain = 1.0 + centered * u_depth;
  color.rgb *= gain;

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class PulseNode implements VideoNode {
  readonly nodeName = 'pulse'
  private material: ShaderMaterial | null = null
  private readonly envelope = new PulseEnvelope()
  private rateHz = 1
  private smoothing = 0.9

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const resolved = resolvePulseParameters(params, 0.9)
    this.material.uniforms.u_depth.value = resolved.depth
    this.material.uniforms.u_pulse.value = this.envelope.current()

    applyUvParams(this.material, params)

    this.rateHz = resolved.rate
    this.smoothing = resolved.smoothing
  }

  tick(delta: number): void {
    if (!this.material) return
    this.material.uniforms.u_pulse.value = this.envelope.advance(
      delta,
      this.rateHz,
      this.smoothing,
      { tauScale: 0.6, minTau: 0.02, maxTau: 0.6 },
    )
  }

  getMaterial(inputTexture: Texture): Material {
    this.material = getPulseMaterial(this.material, inputTexture, FRAG, {
      u_depth: { value: 0 },
      u_pulse: { value: 0.5 },
    })
    return this.material
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
