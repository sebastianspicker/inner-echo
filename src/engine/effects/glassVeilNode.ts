/**
 * SSOT: glass_veil: veiled/detached temporal self-image.
 * Params: veil, feedback, refraction, chroma.
 */

import { ShaderMaterial, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import {
  applyUvParams,
  clamp,
  getGlobalClampNumber,
  getSafeModeClampNumber,
  resolveNumberParam,
} from './paramUtils'
import {
  bindInputTexture,
  bindPreviousTexture,
  createEffectMaterial,
  disposeEffectMaterial,
} from './shaderMaterial'

const FRAG = `
uniform sampler2D u_map;
uniform sampler2D u_prev;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_veil;
uniform float u_feedback;
uniform float u_refraction;
uniform float u_chroma;
uniform float u_time;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  float wave = sin((vUv.y * 9.0 + u_time * 0.35) * 6.2831853) * 0.5 + 0.5;
  vec2 refractOffset = vec2((wave - 0.5) * u_refraction, sin(vUv.x * 11.0 + u_time) * u_refraction * 0.35);
  vec2 cuv = uv + refractOffset;
  vec2 chroma = vec2(u_chroma * 0.01, 0.0);

  vec3 curr;
  curr.r = texture2D(u_map, cuv + chroma).r;
  curr.g = texture2D(u_map, cuv).g;
  curr.b = texture2D(u_map, cuv - chroma).b;

  vec3 prev = texture2D(u_prev, uv - refractOffset * 0.45).rgb;
  vec3 color = mix(curr, prev, u_feedback);
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(color, vec3(luma), u_veil * 0.35);
  color = mix(color, vec3(0.82, 0.86, 0.9), u_veil * 0.18);
  color += (wave - 0.5) * u_veil * 0.045;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`

export class GlassVeilNode implements VideoNode {
  readonly nodeName = 'glass_veil'
  readonly needsPreviousFrame = true
  private material: ShaderMaterial | null = null
  private time = 0

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let veil = resolveNumberParam(params, 'veil', 0) * intensity
    let feedback = resolveNumberParam(params, 'feedback', 0) * intensity
    let refraction = resolveNumberParam(params, 'refraction', 0) * intensity
    let chroma = resolveNumberParam(params, 'chroma', 0) * intensity

    const maxFeedback = getGlobalClampNumber(params, 'max_feedback', 0.18)
    const maxChroma = getGlobalClampNumber(params, 'max_chroma', 0.12)
    veil = clamp(veil, 0, 0.45)
    feedback = clamp(feedback, 0, clamp(maxFeedback, 0, 0.35))
    refraction = clamp(refraction, 0, 0.06)
    chroma = clamp(chroma, 0, clamp(maxChroma, 0, 0.2))

    if (params.safeMode) {
      const safeFeedback = getSafeModeClampNumber(params, 'max_feedback', maxFeedback)
      const safeChroma = getSafeModeClampNumber(params, 'max_chroma', maxChroma)
      veil = Math.min(veil, 0.28)
      feedback = Math.min(feedback, clamp(safeFeedback, 0, 0.35))
      refraction = Math.min(refraction, 0.035)
      chroma = Math.min(chroma, clamp(safeChroma, 0, 0.2))
    }

    this.material.uniforms.u_veil.value = veil
    this.material.uniforms.u_feedback.value = feedback
    this.material.uniforms.u_refraction.value = refraction
    this.material.uniforms.u_chroma.value = chroma
    this.material.uniforms.u_time.value = this.time

    applyUvParams(this.material, params)
  }

  tick(delta: number): void {
    if (!this.material) return
    this.time = (this.time + delta) % 1000
    this.material.uniforms.u_time.value = this.time
  }

  getMaterial(inputTexture: Texture, previousFrameTexture?: Texture | null): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, FRAG, {
        u_prev: { value: previousFrameTexture ?? inputTexture },
        u_veil: { value: 0 },
        u_feedback: { value: 0 },
        u_refraction: { value: 0 },
        u_chroma: { value: 0 },
        u_time: { value: 0 },
      })
    } else {
      bindInputTexture(this.material, inputTexture)
      bindPreviousTexture(this.material, inputTexture, previousFrameTexture)
    }
    return this.material
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
