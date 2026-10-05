/**
 * Gaze tunnel: narrowed attention. The centre stays clear and gains micro-contrast while
 * the periphery softens, desaturates and dims. Static (no motion), so Reduced Motion keeps it.
 *
 * Params: amount (tunnel strength), radius (clear region, 0..1 of the half-diagonal),
 * edge_gain (centre detail lift), desaturate (peripheral colour loss).
 */

import { Vector2, type ShaderMaterial, type Material, type Texture } from 'three'
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
uniform float u_radius;
uniform float u_edge_gain;
uniform float u_desaturate;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 center = texture2D(u_map, uv);

  // Distance normalised so the frame corners sit at 1.0.
  float d = length(vUv - 0.5) * 1.4142;
  float peripheral = smoothstep(u_radius, 1.0, d);
  float tunnel = peripheral * u_amount;

  // Peripheral softening grows with the tunnel.
  float r = tunnel * 0.012;
  vec2 rx = vec2(r * u_texelSize.x / u_texelSize.y, 0.0);
  vec2 ry = vec2(0.0, r);
  vec3 soft = (
    texture2D(u_map, uv + rx).rgb +
    texture2D(u_map, uv - rx).rgb +
    texture2D(u_map, uv + ry).rgb +
    texture2D(u_map, uv - ry).rgb
  ) * 0.25;
  vec3 color = mix(center.rgb, soft, clamp(tunnel * 1.5, 0.0, 1.0));

  // Centre micro-contrast: a small unsharp mask that fades out toward the periphery.
  vec2 dx = vec2(u_texelSize.x * 1.5, 0.0);
  vec2 dy = vec2(0.0, u_texelSize.y * 1.5);
  vec3 local = (
    center.rgb +
    texture2D(u_map, uv + dx).rgb +
    texture2D(u_map, uv - dx).rgb +
    texture2D(u_map, uv + dy).rgb +
    texture2D(u_map, uv - dy).rgb
  ) * 0.2;
  vec3 detail = center.rgb - local;
  color += detail * u_edge_gain * 2.0 * u_amount * (1.0 - peripheral);

  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(color, vec3(luma), tunnel * u_desaturate);
  color *= 1.0 - tunnel * 0.55;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`

export class GazeTunnelNode implements VideoNode {
  readonly nodeName = 'gaze_tunnel'
  private material: ShaderMaterial | null = null

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    let edgeGain = resolveNumberParam(params, 'edge_gain', 0.3) * intensity
    const radius = resolveNumberParam(params, 'radius', 0.42)
    const desaturate = resolveNumberParam(params, 'desaturate', 0.3)

    const globalMax = getGlobalClampNumber(params, 'max_intensity', 1)
    amount = clamp(amount, 0, Math.min(0.85, globalMax))
    edgeGain = clamp(edgeGain, 0, 1)

    if (params.safeMode) {
      const safeMax = getSafeModeClampNumber(params, 'max_intensity', globalMax)
      amount = Math.min(amount, Math.min(0.65, safeMax))
      edgeGain = Math.min(edgeGain, 0.6)
    }

    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_radius.value = clamp(radius, 0.18, 0.75)
    this.material.uniforms.u_edge_gain.value = edgeGain
    this.material.uniforms.u_desaturate.value = clamp(desaturate, 0, 0.7)
    updateTexelSize(this.material, this.material.uniforms.u_map.value as Texture)
    applyUvParams(this.material, params)
  }

  getMaterial(inputTexture: Texture): Material {
    this.material = acquireEffectMaterial(this.material, inputTexture, FRAG, () => ({
      u_amount: { value: 0 },
      u_radius: { value: 0.42 },
      u_edge_gain: { value: 0.3 },
      u_desaturate: { value: 0.3 },
      u_texelSize: { value: new Vector2(1 / 400, 1 / 400) },
    }))
    return this.material
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
