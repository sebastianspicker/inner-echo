/**
 * SSOT: focus_jitter — gentle, smoothed UV wobble (disabled by Reduced Motion).
 * Params: amount, smoothing.
 */

import { ShaderMaterial, Vector2, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { fastRandom } from '../../utils/fastRandom'
import {
  applyUvParams,
  clamp,
  getGlobalClampNumber,
  getSafeModeClampNumber,
  resolveNumberParam,
  QUAD_VERTEX_SHADER,
} from './paramUtils'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export class FocusJitterNode implements VideoNode {
  readonly nodeName = 'focus_jitter'
  private material: ShaderMaterial | null = null
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: used in tick()
  private t = 0
  private nextSampleIn = 0
  private targetX = 0
  private targetY = 0
  private currentX = 0
  private currentY = 0

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    const smoothing = clamp(resolveNumberParam(params, 'smoothing', 0.92), 0, 0.999)

    const globalMaxJitter = getGlobalClampNumber(params, 'max_jitter', 0.06)
    amount = clamp(amount, 0, clamp(globalMaxJitter, 0, 0.2))
    if (params.safeMode) {
      const maxJitter = getSafeModeClampNumber(params, 'max_jitter', globalMaxJitter)
      amount = Math.min(amount, clamp(maxJitter, 0, 0.2))
    }

    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_offset.value.set(this.currentX, this.currentY)
    this.material.uniforms.u_smoothing.value = smoothing

    applyUvParams(this.material, params)
  }

  tick(delta: number): void {
    if (!this.material) return
    this.t += delta
    const amount = this.material.uniforms.u_amount.value as number
    const smoothing = this.material.uniforms.u_smoothing.value as number

    this.nextSampleIn -= delta
    if (this.nextSampleIn <= 0) {
      // Slow, non-rhythmic sampling to avoid strobe-like motion.
      this.nextSampleIn = 0.35 + fastRandom() * 0.5
      const ax = (fastRandom() * 2 - 1) * amount
      const ay = (fastRandom() * 2 - 1) * amount
      this.targetX = ax
      this.targetY = ay
    }

    // Exponential smoothing controlled by smoothing (higher = slower).
    const tau = clamp((1 - smoothing) * 0.8, 0.02, 0.6)
    const t = 1 - Math.exp(-delta / tau)
    this.currentX = lerp(this.currentX, this.targetX, t)
    this.currentY = lerp(this.currentY, this.targetY, t)

    this.material.uniforms.u_offset.value.set(this.currentX, this.currentY)
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
        u_smoothing: { value: 0.92 },
        u_offset: { value: new Vector2(0, 0) },
      },
      vertexShader: QUAD_VERTEX_SHADER,
      fragmentShader: `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform vec2 u_offset;
varying vec2 vUv;
void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset + u_offset;
  vec4 color = texture2D(u_map, uv);
  gl_FragColor = clamp(color, 0.0, 1.0);
}
`,
      depthWrite: false,
    })
    return this.material
  }

  dispose(): void {
    this.material?.dispose()
    this.material = null
  }
}
