/**
 * SSOT: salience_competition — competing attention anchors and small jumps.
 * Params: amount, marker_strength, shift, jump_rate.
 */

import { ShaderMaterial, Vector2, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import {
  applyUvParams,
  clamp,
  getGlobalClampNumber,
  getSafeModeClampNumber,
  resolveNumberParam,
  QUAD_VERTEX_SHADER,
} from './paramUtils'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
uniform float u_marker_strength;
uniform float u_shift;
uniform vec2 u_anchor_a;
uniform vec2 u_anchor_b;
varying vec2 vUv;

float ring(vec2 p, vec2 c, float radius) {
  float d = distance(p, c);
  return smoothstep(radius + 0.045, radius, d) * smoothstep(radius - 0.035, radius, d);
}

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec2 target = mix(u_anchor_a, u_anchor_b, 0.45);
  vec2 shift = (target - vUv) * u_shift * u_amount;
  vec4 color = texture2D(u_map, uv + shift);

  float a = ring(vUv, u_anchor_a, 0.16);
  float b = ring(vUv, u_anchor_b, 0.12);
  float c = smoothstep(0.2, 0.0, distance(vUv, vec2(0.78, 0.32))) * 0.55;
  float markers = clamp((a + b + c) * u_marker_strength * u_amount, 0.0, 1.0);
  vec3 luma = vec3(dot(color.rgb, vec3(0.299, 0.587, 0.114)));
  color.rgb = mix(color.rgb, max(color.rgb, luma + vec3(0.16)), markers);
  color.rgb += markers * vec3(0.04, 0.035, 0.01);

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class SalienceCompetitionNode implements VideoNode {
  readonly nodeName = 'salience_competition'
  private material: ShaderMaterial | null = null
  private time = 0
  private jumpRate = 1.2

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    let shift = resolveNumberParam(params, 'shift', 0.04) * intensity
    const markerStrength = resolveNumberParam(params, 'marker_strength', 0.5)
    const jumpRate = resolveNumberParam(params, 'jump_rate', 1.2)

    const globalMax = getGlobalClampNumber(params, 'max_intensity', 1)
    const globalJitter = getGlobalClampNumber(params, 'max_jitter', 0.06)
    amount = clamp(amount, 0, Math.min(0.3, globalMax))
    shift = clamp(shift, 0, Math.min(0.08, globalJitter))

    if (params.safeMode) {
      const safeMax = getSafeModeClampNumber(params, 'max_intensity', globalMax)
      const safeJitter = getSafeModeClampNumber(params, 'max_jitter', globalJitter)
      amount = Math.min(amount, Math.min(0.2, safeMax))
      shift = Math.min(shift, Math.min(0.045, safeJitter))
    }

    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_marker_strength.value = clamp(markerStrength, 0, 1)
    this.material.uniforms.u_shift.value = shift
    this.jumpRate = clamp(jumpRate, 0.1, 3)

    applyUvParams(this.material, params)
  }

  tick(delta: number): void {
    if (!this.material) return
    this.time += delta
    const segment = Math.floor(this.time * this.jumpRate)
    const ax = 0.22 + 0.56 * (Math.sin(segment * 12.9898) * 0.5 + 0.5)
    const ay = 0.2 + 0.58 * (Math.sin(segment * 78.233) * 0.5 + 0.5)
    const bx = 0.18 + 0.62 * (Math.sin((segment + 3) * 39.425) * 0.5 + 0.5)
    const by = 0.18 + 0.62 * (Math.sin((segment + 5) * 17.17) * 0.5 + 0.5)
    this.material.uniforms.u_anchor_a.value.set(ax, ay)
    this.material.uniforms.u_anchor_b.value.set(bx, by)
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
        u_marker_strength: { value: 0.5 },
        u_shift: { value: 0.04 },
        u_anchor_a: { value: new Vector2(0.3, 0.35) },
        u_anchor_b: { value: new Vector2(0.68, 0.62) },
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
