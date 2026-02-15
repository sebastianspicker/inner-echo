/**
 * SSOT: grid_hint — very subtle structure hint (static overlay).
 * Param: amount.
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
  private material: THREE.ShaderMaterial | null = null

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    amount = clamp(amount, 0, 0.1)
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

