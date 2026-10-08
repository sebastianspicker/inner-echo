/**
 * Glass veil: the world seen through a pane. A pale, slightly milky lift with reduced
 * contrast and colour, a very slow large-scale ripple (`refraction`), a small colour
 * fringe (`chroma`) and a short persistence ghost (`feedback`) that lags the live image.
 * Reduced Motion disables the node.
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
import {
  bindInputTexture,
  bindPreviousTexture,
  createEffectMaterial,
  disposeEffectMaterial,
  updateTexelSize,
} from './shaderMaterial'
import { DISC_BLUR_GLSL, HASH_GLSL, TEMPORAL_DITHER_GLSL } from './shaderKernels'
import { persistenceBlend, persistenceSeconds } from './temporalBlend'

const PERSISTENCE_SECONDS_AT_REFERENCE = 0.45

const FRAG = `
uniform sampler2D u_map;
uniform sampler2D u_prev;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform vec2 u_texelSize;
uniform float u_veil;
uniform float u_blend;
uniform float u_refraction;
uniform float u_chroma;
uniform float u_time;
uniform float u_dither;
varying vec2 vUv;

${HASH_GLSL}${DISC_BLUR_GLSL}${TEMPORAL_DITHER_GLSL}
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = ieHash(i);
  float b = ieHash(i + vec2(1.0, 0.0));
  float c = ieHash(i + vec2(0.0, 1.0));
  float d = ieHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;

  // Slow, large-scale ripple, like uneven glass.
  vec2 warp = vec2(
    valueNoise(vUv * 3.0 + vec2(u_time * 0.05, 0.0)),
    valueNoise(vUv * 3.0 + vec2(7.3, u_time * 0.04))
  ) - 0.5;
  vec2 cuv = uv + warp * u_refraction;

  // Radial colour fringe: red and blue split apart toward the frame edges.
  vec2 fringe = (cuv - 0.5) * u_chroma * 0.08;
  vec3 curr = texture2D(u_map, cuv).rgb;
  if (u_chroma > 0.0) {
    curr.r = texture2D(u_map, cuv + fringe).r;
    curr.b = texture2D(u_map, cuv - fringe).b;
  }

  // Milky softening.
  if (u_veil > 0.0005) {
    vec3 soft = ieDiscBlur(u_map, cuv, vUv, u_veil * 0.008, u_texelSize);
    curr = mix(curr, soft, clamp(u_veil * 1.2, 0.0, 1.0));
  }

  // The veil is applied to the live frame only. The previous frame is this node's own
  // output and is already veiled, so blending after the veil would accumulate the lift.
  float luma = dot(curr, vec3(0.2126, 0.7152, 0.0722));
  curr = mix(curr, vec3(luma), u_veil * 0.45);
  curr = mix(curr, vec3(0.80, 0.84, 0.88), u_veil * 0.3);
  curr = (curr - 0.5) * (1.0 - u_veil * 0.2) + 0.5;

  // Persistence ghost from the previous (already veiled) frame, in output space.
  vec3 prev = texture2D(u_prev, vUv).rgb;
  vec3 color = mix(curr, prev, u_blend);
  color += ieDither(vUv, u_time) * u_dither;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`

export class GlassVeilNode implements VideoNode {
  readonly nodeName = 'glass_veil'
  readonly needsPreviousFrame = true
  private material: ShaderMaterial | null = null
  private time = 0
  private feedback = 0

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let veil = resolveNumberParam(params, 'veil', 0) * intensity
    let feedback = resolveNumberParam(params, 'feedback', 0) * intensity
    let refraction = resolveNumberParam(params, 'refraction', 0) * intensity
    let chroma = resolveNumberParam(params, 'chroma', 0) * intensity

    const maxFeedback = getGlobalClampNumber(params, 'max_feedback', 0.18)
    const maxChroma = getGlobalClampNumber(params, 'max_chroma', 0.12)
    veil = clamp(veil, 0, 1)
    feedback = clamp(feedback, 0, clamp(maxFeedback, 0, 0.35))
    refraction = clamp(refraction, 0, 0.06)
    chroma = clamp(chroma, 0, clamp(maxChroma, 0, 0.2))

    if (params.safeMode) {
      const safeFeedback = getSafeModeClampNumber(params, 'max_feedback', maxFeedback)
      const safeChroma = getSafeModeClampNumber(params, 'max_chroma', maxChroma)
      veil = Math.min(veil, 0.7)
      feedback = Math.min(feedback, clamp(safeFeedback, 0, 0.35))
      refraction = Math.min(refraction, 0.035)
      chroma = Math.min(chroma, clamp(safeChroma, 0, 0.2))
    }

    this.feedback = feedback
    this.material.uniforms.u_veil.value = veil
    this.material.uniforms.u_feedback.value = feedback
    this.material.uniforms.u_refraction.value = refraction
    this.material.uniforms.u_chroma.value = chroma
    this.material.uniforms.u_time.value = this.time
    this.material.uniforms.u_dither.value = params.ditherAmplitude ?? 1 / 255
    updateTexelSize(this.material, this.material.uniforms.u_map.value as Texture)
    applyUvParams(this.material, params)
  }

  tick(delta: number): void {
    if (!this.material) return
    this.time = (this.time + delta) % 1000
    this.material.uniforms.u_time.value = this.time
    const tau = persistenceSeconds(this.feedback, 0.94, PERSISTENCE_SECONDS_AT_REFERENCE)
    this.material.uniforms.u_blend.value = persistenceBlend(tau, delta)
  }

  getMaterial(inputTexture: Texture, previousFrameTexture?: Texture | null): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, FRAG, {
        u_prev: { value: previousFrameTexture ?? inputTexture },
        u_veil: { value: 0 },
        u_feedback: { value: 0 },
        u_blend: { value: 0 },
        u_refraction: { value: 0 },
        u_chroma: { value: 0 },
        u_time: { value: 0 },
        u_dither: { value: 1 / 255 },
        u_texelSize: { value: new Vector2(1 / 400, 1 / 400) },
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
