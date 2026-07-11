/**
 * SSOT: gaze_tunnel — narrowed central attention with peripheral damping.
 * Params: amount, radius, edge_gain, desaturate.
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
uniform float u_radius;
uniform float u_edge_gain;
uniform float u_desaturate;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 color = texture2D(u_map, uv);

  vec2 center = vec2(0.5, 0.5);
  float d = distance(vUv, center);
  float peripheral = smoothstep(u_radius, 0.95, d);
  float tunnel = peripheral * u_amount;

  vec2 px = vec2(0.0025, 0.0);
  vec2 py = vec2(0.0, 0.0025);
  vec3 cx0 = texture2D(u_map, uv - px).rgb;
  vec3 cx1 = texture2D(u_map, uv + px).rgb;
  vec3 cy0 = texture2D(u_map, uv - py).rgb;
  vec3 cy1 = texture2D(u_map, uv + py).rgb;
  float edge = length(cx1 - cx0) + length(cy1 - cy0);

  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(color.rgb, vec3(luma), tunnel * u_desaturate);
  color.rgb *= 1.0 - tunnel * 0.72;
  color.rgb += edge * u_edge_gain * u_amount * (1.0 - peripheral * 0.35);

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class GazeTunnelNode implements VideoNode {
  readonly nodeName = 'gaze_tunnel'
  private material: ShaderMaterial | null = null

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    let edgeGain = resolveNumberParam(params, 'edge_gain', 0.12) * intensity
    const radius = resolveNumberParam(params, 'radius', 0.42)
    const desaturate = resolveNumberParam(params, 'desaturate', 0.16)

    const globalMax = getGlobalClampNumber(params, 'max_intensity', 1)
    amount = clamp(amount, 0, Math.min(0.85, globalMax))
    edgeGain = clamp(edgeGain, 0, 0.35)

    if (params.safeMode) {
      const safeMax = getSafeModeClampNumber(params, 'max_intensity', globalMax)
      amount = Math.min(amount, Math.min(0.65, safeMax))
      edgeGain = Math.min(edgeGain, 0.22)
    }

    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_radius.value = clamp(radius, 0.18, 0.75)
    this.material.uniforms.u_edge_gain.value = edgeGain
    this.material.uniforms.u_desaturate.value = clamp(desaturate, 0, 0.7)

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
        u_radius: { value: 0.42 },
        u_edge_gain: { value: 0.12 },
        u_desaturate: { value: 0.16 },
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
