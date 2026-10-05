/**
 * Fine luminance grain: a persistent texture that re-seeds at a bounded rate.
 *
 * - `amount` is the peak luminance offset at full intensity (midtone-weighted, like film grain).
 * - `scale` is the grain cell size in texels, so the texture reads the same at every resolution.
 * - `speed` is how often the pattern re-seeds: 0 keeps one static texture, 0.2 re-seeds 60 times
 *   per second. Re-seeding never changes mean luminance, so it is not a flash.
 */

import { Vector2, type ShaderMaterial, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams, clamp, getSafeModeClampNumber, resolveNumberParam } from './paramUtils'
import {
  bindInputTexture,
  createEffectMaterial,
  disposeEffectMaterial,
  updateTexelSize,
} from './shaderMaterial'

/** `speed` 0.2 (the declared maximum) re-seeds 60 times per second. */
const RESEED_HZ_PER_SPEED = 300

const GRAIN_FRAGMENT = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform vec2 u_texelSize;
uniform float u_amount;
uniform float u_seed;
uniform float u_scale;
varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 color = texture2D(u_map, uv);

  // One grain cell spans u_scale texels; the seed moves the pattern to a new random field.
  vec2 cell = floor(vUv / (u_texelSize * u_scale));
  float n = rand(cell * 0.01 + vec2(u_seed * 0.173, u_seed * 0.311)) * 2.0 - 1.0;

  // Film-like weighting: strongest in the midtones, fading in deep shadow and highlight.
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  float midtone = 1.0 - abs(2.0 * luma - 1.0);
  color.rgb += n * u_amount * (0.55 + 0.45 * midtone);

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class GrainNode implements VideoNode {
  readonly nodeName = 'grain'
  private material: ShaderMaterial | null = null
  private time = 0
  /** Clamped re-seed control (0..0.2); read by contract probes. */
  private speed = 0.08

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    // Reduced Motion freezes the texture: the pattern then never re-seeds.
    const reducedMotion = params.controlValues?.reducedMotion === true
    this.speed = reducedMotion ? 0 : clamp(resolveNumberParam(params, 'speed', 0.08), 0, 0.2)
    const scale = clamp(resolveNumberParam(params, 'scale', 1.2), 0.5, 3)

    // Keep grain conservative to avoid harsh speckle.
    amount = clamp(amount, 0, 0.5)

    // Safe Mode can optionally clamp overall intensity further; keep a conservative cap here too.
    if (params.safeMode) {
      const maxIntensity = getSafeModeClampNumber(params, 'max_intensity', 1)
      amount = Math.min(amount, 0.5 * clamp(maxIntensity, 0, 1))
    }

    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_seed.value = this.currentSeed()
    this.material.uniforms.u_scale.value = scale
    updateTexelSize(this.material, this.material.uniforms.u_map.value as Texture)
    applyUvParams(this.material, params)
  }

  getMaterial(inputTexture: Texture, _previousFrameTexture?: Texture | null): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, GRAIN_FRAGMENT, {
        u_amount: { value: 0 },
        u_seed: { value: 0 },
        u_scale: { value: 1.2 },
        u_texelSize: { value: new Vector2(1 / 400, 1 / 400) },
      })
    } else {
      bindInputTexture(this.material, inputTexture)
    }
    return this.material
  }

  /** Advances time once per frame; the seed only changes at the bounded re-seed rate. */
  tick(delta: number): void {
    this.time = (this.time + delta) % 1000
    if (this.material) this.material.uniforms.u_seed.value = this.currentSeed()
  }

  private currentSeed(): number {
    return Math.floor(this.time * this.speed * RESEED_HZ_PER_SPEED)
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
