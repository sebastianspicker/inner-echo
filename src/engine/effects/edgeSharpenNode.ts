/**
 * SSOT: edge_sharpen — subtle unsharp mask (single pass).
 */

import * as THREE from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams, clamp, resolveNumberParam, QUAD_VERTEX_SHADER } from './paramUtils'

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

  vec2 dx = vec2(u_texelSize.x, 0.0);
  vec2 dy = vec2(0.0, u_texelSize.y);
  vec4 blur =
    c * 0.50 +
    texture2D(u_map, uv + dx) * 0.125 +
    texture2D(u_map, uv - dx) * 0.125 +
    texture2D(u_map, uv + dy) * 0.125 +
    texture2D(u_map, uv - dy) * 0.125;

  vec3 detail = c.rgb - blur.rgb;
  vec3 outRgb = c.rgb + detail * u_amount;

  gl_FragColor = vec4(clamp(outRgb, 0.0, 1.0), 1.0);
}
`

export class EdgeSharpenNode implements VideoNode {
  readonly nodeName = 'edge_sharpen'
  private material: THREE.ShaderMaterial | null = null

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    amount = clamp(amount, 0, 0.2)
    this.material.uniforms.u_amount.value = amount
    // Compute texel size from the input texture dimensions, fallback to a conservative default.
    const tex = this.material.uniforms.u_map.value as THREE.Texture | null
    const img = tex?.image as { width?: number; height?: number } | undefined
    const w = img?.width ?? 400
    const h = img?.height ?? 400
    this.material.uniforms.u_texelSize.value.set(1 / w, 1 / h)
    applyUvParams(this.material, params)
  }

  getMaterial(inputTexture: THREE.Texture): THREE.Material {
    if (this.material) {
      this.material.uniforms.u_map.value = inputTexture
      return this.material
    }
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_map: { value: inputTexture },
        u_uvScale: { value: new THREE.Vector2(1, 1) },
        u_uvOffset: { value: new THREE.Vector2(0, 0) },
        u_amount: { value: 0 },
        u_texelSize: { value: new THREE.Vector2(1 / 400, 1 / 400) },
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

