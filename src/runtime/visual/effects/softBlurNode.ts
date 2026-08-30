/**
 * SSOT: soft_blur: subtle blur (single-pass, low cost).
 * Note: We intentionally keep the kernel small to avoid performance issues.
 */

import { ShaderMaterial, Vector2, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams, clamp, resolveNumberParam } from './paramUtils'
import {
  bindInputTexture,
  createEffectMaterial,
  disposeEffectMaterial,
  updateTexelSize,
} from './shaderMaterial'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
uniform vec2 u_texelSize;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 c = texture2D(u_map, uv);

  // Amount maps to a small UV radius; conservative to prevent disorientation.
  // Use texel size to ensure consistent blur across different resolutions and aspect ratios.
  float r = u_amount * 0.008;
  vec2 dx = vec2(r * u_texelSize.x / u_texelSize.y, 0.0);
  vec2 dy = vec2(0.0, r);

  vec4 blur =
    c * 0.40 +
    texture2D(u_map, uv + dx) * 0.15 +
    texture2D(u_map, uv - dx) * 0.15 +
    texture2D(u_map, uv + dy) * 0.15 +
    texture2D(u_map, uv - dy) * 0.15;

  gl_FragColor = clamp(blur, 0.0, 1.0);
}
`

export class SoftBlurNode implements VideoNode {
  readonly nodeName = 'soft_blur'
  private material: ShaderMaterial | null = null

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    // SSOT: keep blur in a comfortable range.
    amount = clamp(amount, 0, 0.35)
    this.material.uniforms.u_amount.value = amount
    // Update texel size from texture dimensions for aspect-correct blur
    updateTexelSize(this.material, this.material.uniforms.u_map.value as Texture)
    applyUvParams(this.material, params)
  }

  getMaterial(inputTexture: Texture): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, FRAG, {
        u_amount: { value: 0 },
        u_texelSize: { value: new Vector2(1 / 400, 1 / 400) },
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
