/**
 * Salience competition: an attention spotlight that will not stay put. One region of the
 * frame stays sharp and slightly lifted while everything else softens, dims and loses a
 * little colour; a weaker competing spot pulls elsewhere. The spots hold, then move to new
 * positions with eased transitions at `jump_rate` per second. Reduced Motion disables it.
 *
 * Params: amount (periphery softening), marker_strength (spot lift), shift (image pull
 * toward the spots), jump_rate.
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
import { acquireEffectMaterial, disposeEffectMaterial, updateTexelSize } from './shaderMaterial'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform vec2 u_texelSize;
uniform float u_amount;
uniform float u_marker_strength;
uniform float u_shift;
uniform vec2 u_anchor_a;
uniform vec2 u_anchor_b;
varying vec2 vUv;

float spot(vec2 p, vec2 c, float aspect) {
  return 1.0 - smoothstep(0.10, 0.32, distance(p * vec2(aspect, 1.0), c * vec2(aspect, 1.0)));
}

void main() {
  float aspect = u_texelSize.y / u_texelSize.x;
  vec2 target = mix(u_anchor_a, u_anchor_b, 0.3);
  vec2 pull = (target - vUv) * u_shift;
  vec2 uv = (vUv + pull) * u_uvScale + u_uvOffset;
  vec4 sharp = texture2D(u_map, uv);

  float focus = clamp(max(spot(vUv, u_anchor_a, aspect), spot(vUv, u_anchor_b, aspect) * 0.6), 0.0, 1.0);
  float periphery = (1.0 - focus) * u_amount;

  // Everything outside the attention spots softens, dims and loses colour.
  float r = periphery * 0.012;
  vec2 rx = vec2(r * u_texelSize.x / u_texelSize.y, 0.0);
  vec2 ry = vec2(0.0, r);
  vec3 soft = (
    texture2D(u_map, uv + rx).rgb +
    texture2D(u_map, uv - rx).rgb +
    texture2D(u_map, uv + ry).rgb +
    texture2D(u_map, uv - ry).rgb
  ) * 0.25;
  vec3 color = mix(sharp.rgb, soft, clamp(periphery * 1.5, 0.0, 1.0));
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(color, vec3(luma), periphery * 0.35);
  color *= 1.0 - periphery * 0.3;

  // The spot itself is lifted and a little crisper in contrast.
  float marker = focus * u_marker_strength * u_amount;
  color += marker * 0.12;
  color = mix(color, (color - 0.5) * 1.15 + 0.5, marker);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
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

/** Hold for most of the segment, then move smoothly to the next anchors. */
function easedAnchorPair(phase: number): AnchorPair {
  const segment = Math.floor(phase)
  const progress = phase - segment
  const t = clamp((progress - 0.6) / 0.3, 0, 1)
  const eased = t * t * (3 - 2 * t)
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
    let shift = resolveNumberParam(params, 'shift', 0.03) * intensity
    const markerStrength = resolveNumberParam(params, 'marker_strength', 0.5)
    const jumpRate = resolveNumberParam(params, 'jump_rate', 1.2)

    const globalMax = getGlobalClampNumber(params, 'max_intensity', 1)
    const globalJitter = getGlobalClampNumber(params, 'max_jitter', 0.06)
    amount = clamp(amount, 0, Math.min(1, globalMax))
    shift = clamp(shift, 0, Math.min(0.08, globalJitter))

    if (params.safeMode) {
      const safeMax = getSafeModeClampNumber(params, 'max_intensity', globalMax)
      const safeJitter = getSafeModeClampNumber(params, 'max_jitter', globalJitter)
      amount = Math.min(amount, Math.min(0.7, safeMax))
      shift = Math.min(shift, Math.min(0.045, safeJitter))
    }

    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_marker_strength.value = clamp(markerStrength, 0, 1)
    this.material.uniforms.u_shift.value = shift
    this.jumpRate = clamp(jumpRate, 0.1, 3)
    updateTexelSize(this.material, this.material.uniforms.u_map.value as Texture)

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
    this.material = acquireEffectMaterial(this.material, inputTexture, FRAG, () => ({
      u_amount: { value: 0 },
      u_marker_strength: { value: 0.5 },
      u_shift: { value: 0.03 },
      u_anchor_a: { value: new Vector2(INITIAL_ANCHORS.ax, INITIAL_ANCHORS.ay) },
      u_anchor_b: { value: new Vector2(INITIAL_ANCHORS.bx, INITIAL_ANCHORS.by) },
      u_texelSize: { value: new Vector2(1 / 400, 1 / 400) },
    }))
    return this.material
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
