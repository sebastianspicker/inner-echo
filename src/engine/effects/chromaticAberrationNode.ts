/**
 * Chromatic aberration: RGB channel offset in a single pass.
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
import { bindInputTexture, createEffectMaterial, disposeEffectMaterial } from './shaderMaterial'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec2 c = uv - 0.5;
  float d = length(c);
  vec2 off = c * u_amount * d * 2.0;
  float r = texture2D(u_map, uv + off).r;
  float g = texture2D(u_map, uv).g;
  float b = texture2D(u_map, uv - off).b;
  vec4 color = vec4(r, g, b, 1.0);
  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class ChromaticAberrationNode implements VideoNode {
  readonly nodeName = 'chromatic_aberration'
  private material: ShaderMaterial | null = null

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    const globalMaxChroma = getGlobalClampNumber(params, 'max_chroma', 0.12)
    amount = clamp(amount, 0, clamp(globalMaxChroma, 0, 0.5))
    if (params.safeMode) {
      const maxChroma = getSafeModeClampNumber(params, 'max_chroma', globalMaxChroma)
      amount = Math.min(amount, clamp(maxChroma, 0, 0.5))
    }
    this.material.uniforms.u_amount.value = amount
    applyUvParams(this.material, params)
  }

  getMaterial(inputTexture: Texture, _previousFrame?: Texture | null): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, FRAG, {
        u_amount: { value: 0.02 },
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
