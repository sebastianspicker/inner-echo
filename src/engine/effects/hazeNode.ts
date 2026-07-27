/**
 * SSOT: haze: gentle veil / fog-like lift (static, non-disorienting).
 */

import { ShaderMaterial, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams, clamp, resolveNumberParam } from './paramUtils'
import { bindInputTexture, createEffectMaterial, disposeEffectMaterial } from './shaderMaterial'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
uniform float u_time;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 color = texture2D(u_map, uv);

  // A soft veil that slightly lifts and desaturates, with animated micro-noise to avoid banding.
  float n = hash(vUv * 213.7 + u_time * 0.1) - 0.5;
  vec3 veil = vec3(0.5) + n * 0.03;
  color.rgb = mix(color.rgb, veil, u_amount);

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class HazeNode implements VideoNode {
  readonly nodeName = 'haze'
  private material: ShaderMaterial | null = null
  private time = 0

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    amount = clamp(amount, 0, 0.25)
    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_time.value = this.time
    applyUvParams(this.material, params)
  }

  tick(delta: number): void {
    this.time = (this.time + delta) % 1000
  }

  getMaterial(inputTexture: Texture): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, FRAG, {
        u_amount: { value: 0 },
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
