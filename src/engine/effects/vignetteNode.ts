/**
 * Phase 6: Vignette effect — darkens edges. Single pass, amount (and optional softness).
 */

import { ShaderMaterial, Vector2, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import {
  applyUvParams,
  clamp,
  getSafeModeClampNumber,
  resolveNumberParam,
  QUAD_VERTEX_SHADER,
} from './paramUtils'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
uniform float u_softness;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 color = texture2D(u_map, uv);
  vec2 c = vUv - 0.5;
  float d = length(c) * 2.0;
  float v = 1.0 - smoothstep(1.0 - u_softness, 1.0, d) * u_amount;
  color.rgb *= v;
  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class VignetteNode implements VideoNode {
  readonly nodeName = 'vignette'
  private material: ShaderMaterial | null = null

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    const softness = resolveNumberParam(params, 'softness', 0.75)

    // SSOT: vignette amount is capped for comfort.
    amount = clamp(amount, 0, 0.6)
    if (params.safeMode) {
      const maxIntensity = getSafeModeClampNumber(params, 'max_intensity', 1)
      amount = Math.min(amount, 0.6 * clamp(maxIntensity, 0, 1))
    }
    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_softness.value = clamp(softness, 0.01, 1)
    applyUvParams(this.material, params)
  }

  getMaterial(inputTexture: Texture, _previousFrame?: Texture | null): Material {
    if (this.material) {
      this.material.uniforms.u_map.value = inputTexture
      return this.material
    }
    this.material = new ShaderMaterial({
      uniforms: {
        u_map: { value: inputTexture },
        u_uvScale: { value: new Vector2(1, 1) },
        u_uvOffset: { value: new Vector2(0, 0) },
        u_amount: { value: 0.3 },
        u_softness: { value: 0.75 },
      },
      vertexShader: QUAD_VERTEX_SHADER,
      fragmentShader: FRAG,
      depthWrite: false,
    })
    return this.material
  }

  dispose(): void {
    if (this.material) {
      this.material.dispose()
      this.material = null
    }
  }
}
