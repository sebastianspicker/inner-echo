/**
 * Grain/noise effect node: single ShaderMaterial with updatable uniforms.
 */

import { ShaderMaterial, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams, clamp, getSafeModeClampNumber, resolveNumberParam } from './paramUtils'
import { bindInputTexture, createEffectMaterial, disposeEffectMaterial } from './shaderMaterial'

const GRAIN_FRAGMENT = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
uniform float u_time;
uniform float u_scale;
varying vec2 vUv;

// Pseudorandom from uv + time (noise for grain)
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 color = texture2D(u_map, uv);

  vec2 seed = vUv * u_scale + u_time;
  float n = rand(seed) * 2.0 - 1.0;
  float grain = n * u_amount;

  color.rgb += grain;
  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class GrainNode implements VideoNode {
  readonly nodeName = 'grain'
  private material: ShaderMaterial | null = null
  private time = 0

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    const speed = clamp(resolveNumberParam(params, 'speed', 0.08), 0, 0.2)
    const scale = clamp(resolveNumberParam(params, 'scale', 1.2), 0.5, 3)

    // SSOT: keep grain conservative (no harsh speckle).
    amount = clamp(amount, 0, 0.5)

    // Safe Mode can optionally clamp overall intensity further; keep a conservative cap here too.
    if (params.safeMode) {
      const maxIntensity = getSafeModeClampNumber(params, 'max_intensity', 1)
      amount = Math.min(amount, 0.5 * clamp(maxIntensity, 0, 1))
    }

    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_time.value = this.time * speed
    this.material.uniforms.u_scale.value = scale
    applyUvParams(this.material, params)
  }

  getMaterial(inputTexture: Texture, _previousFrameTexture?: Texture | null): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, GRAIN_FRAGMENT, {
        u_amount: { value: 0 },
        u_time: { value: 0 },
        u_scale: { value: 1.2 },
      })
    } else {
      bindInputTexture(this.material, inputTexture)
    }
    return this.material
  }

  /**
   * Call once per frame from the pipeline to advance time (optional animation).
   */
  tick(delta: number): void {
    this.time = (this.time + delta) % 1000
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
