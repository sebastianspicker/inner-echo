/**
 * Competing attention anchors with small jumps.
 * Params: amount, marker_strength, shift, jump_rate.
 */

import { type ShaderMaterial, Vector2, type Material, type Texture } from 'three'
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

interface AnchorPair {
  ax: number
  ay: number
  bx: number
  by: number
}

const INITIAL_ANCHORS: AnchorPair = { ax: 0.3, ay: 0.35, bx: 0.68, by: 0.62 }

function anchorsForSegment(segment: number): AnchorPair {
  if (segment === 0) return INITIAL_ANCHORS
  return {
    ax: 0.22 + 0.56 * (Math.sin(segment * 12.9898) * 0.5 + 0.5),
    ay: 0.2 + 0.58 * (Math.sin(segment * 78.233) * 0.5 + 0.5),
    bx: 0.18 + 0.62 * (Math.sin((segment + 3) * 39.425) * 0.5 + 0.5),
    by: 0.18 + 0.62 * (Math.sin((segment + 5) * 17.17) * 0.5 + 0.5),
  }
}

function interpolate(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

function easedAnchorPair(phase: number): AnchorPair {
  const segment = Math.floor(phase)
  const progress = phase - segment
  const eased = progress * progress * (3 - 2 * progress)
  const from = anchorsForSegment(segment)
  const to = anchorsForSegment(segment + 1)
  return {
    ax: interpolate(from.ax, to.ax, eased),
    ay: interpolate(from.ay, to.ay, eased),
    bx: interpolate(from.bx, to.bx, eased),
    by: interpolate(from.by, to.by, eased),
  }
}

export class SalienceCompetitionNode implements VideoNode {
  readonly nodeName = 'salience_competition'
  private material: ShaderMaterial | null = null
  private phase = 0
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
    this.phase += Math.max(0, delta) * this.jumpRate
    const { ax, ay, bx, by } = easedAnchorPair(this.phase)
    this.material.uniforms.u_anchor_a.value.set(ax, ay)
    this.material.uniforms.u_anchor_b.value.set(bx, by)
  }

  getMaterial(inputTexture: Texture): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, FRAG, {
        u_amount: { value: 0 },
        u_marker_strength: { value: 0.5 },
        u_shift: { value: 0.04 },
        u_anchor_a: { value: new Vector2(INITIAL_ANCHORS.ax, INITIAL_ANCHORS.ay) },
        u_anchor_b: { value: new Vector2(INITIAL_ANCHORS.bx, INITIAL_ANCHORS.by) },
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
