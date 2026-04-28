/**
 * SSOT: grid_hint — very subtle structure hint (static overlay).
 * Param: amount.
 */

import { ShaderMaterial, Vector2, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams, clamp, resolveNumberParam, QUAD_VERTEX_SHADER } from './paramUtils'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
varying vec2 vUv;

float gridLine(float x, float width) {
  float f = abs(fract(x) - 0.5);
  return smoothstep(width, 0.0, f);
}

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 color = texture2D(u_map, uv);

  float gridSize = 12.0;
  float w = 0.03;
  float gx = gridLine(vUv.x * gridSize, w);
  float gy = gridLine(vUv.y * gridSize, w);
  float g = clamp(gx + gy, 0.0, 1.0);

  // Slight dark line overlay.
  color.rgb *= (1.0 - g * u_amount);
  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class GridHintNode implements VideoNode {
  readonly nodeName = 'grid_hint'
  private material: ShaderMaterial | null = null

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    amount = clamp(amount, 0, 0.1)
    this.material.uniforms.u_amount.value = amount
    applyUvParams(this.material, params)
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
        u_amount: { value: 0 },
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
