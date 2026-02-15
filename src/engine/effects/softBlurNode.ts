/**
 * SSOT: soft_blur — subtle blur (single-pass, low cost).
 * Note: We intentionally keep the kernel small to avoid performance issues.
 */

import * as THREE from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { clamp, resolveNumberParam } from './paramUtils'

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 c = texture2D(u_map, uv);

  // Amount maps to a small UV radius; conservative to prevent disorientation.
  float r = u_amount * 0.008;
  vec2 dx = vec2(r, 0.0);
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
  private material: THREE.ShaderMaterial | null = null

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    // SSOT: keep blur in a comfortable range.
    amount = clamp(amount, 0, 0.35)
    this.material.uniforms.u_amount.value = amount
    if (params.uvScale) {
      this.material.uniforms.u_uvScale.value.set(params.uvScale[0], params.uvScale[1])
    }
    if (params.uvOffset) {
      this.material.uniforms.u_uvOffset.value.set(params.uvOffset[0], params.uvOffset[1])
    }
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
      },
      vertexShader: VERT,
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

