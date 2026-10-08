/**
 * Somatic pulse: a slow visual wave for changing alarm, built from a breath-like sine plus
 * sparse surges that rise, crest and release. At the crest the frame brightens slightly,
 * draws in toward the centre, loses a little colour, and the periphery narrows and softens.
 *
 * Params: depth, rate, smoothing (the breath), tunnel, blur, surge (crest strength) and
 * surge_interval (seconds between surges). Reduced Motion disables the node.
 */

import { Vector2, type ShaderMaterial, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams, clamp, resolveNumberParam } from './paramUtils'
import { getPulseMaterial, PulseEnvelope, resolvePulseParameters } from './pulseEffectSupport'
import { fastRandom, type FastRandom } from './random'
import { RADIAL_GLSL } from './shaderKernels'
import { disposeEffectMaterial, updateTexelSize } from './shaderMaterial'
import { SurgeEnvelope } from './surgeEnvelope'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_depth;
uniform float u_pulse;
uniform float u_surge;
uniform float u_tunnel;
uniform float u_blur;
uniform vec2 u_texelSize;
varying vec2 vUv;

${RADIAL_GLSL}
void main() {
  vec2 center = vec2(0.5, 0.5);
  vec2 radial = vUv - center;
  float d = ieRadialDistance(vUv, u_texelSize);

  // The breath swings -1..1; a surge pushes the wave toward its crest.
  float breath = (u_pulse - 0.5) * 2.0;
  float wave = clamp(breath * 0.5 + u_surge, -1.0, 1.0);
  float crest = max(wave, 0.0);

  // Gentle pull toward the centre at the crest, bounded by depth.
  vec2 zoomUv = center + radial * (1.0 - wave * u_depth * 0.12);
  zoomUv = zoomUv * u_uvScale + u_uvOffset;

  float peripheral = smoothstep(0.35, 1.0, d);
  float blurAmount = u_blur * crest * peripheral;
  vec4 color = texture2D(u_map, zoomUv);
  if (blurAmount > 0.0005) {
    vec2 blurDir = normalize(radial + vec2(0.0001)) * blurAmount * 0.02;
    color = texture2D(u_map, zoomUv - blurDir) * 0.15
      + texture2D(u_map, zoomUv - blurDir * 0.5) * 0.2
      + color * 0.3
      + texture2D(u_map, zoomUv + blurDir * 0.5) * 0.2
      + texture2D(u_map, zoomUv + blurDir) * 0.15;
  }

  float tunnel = peripheral * u_tunnel * (0.45 + 0.55 * crest);
  color.rgb *= 1.0 - tunnel * 0.6;

  // Luminance swell across the wave; the crest also pulls colour slightly toward grey.
  color.rgb *= 1.0 + wave * u_depth;
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  color.rgb = mix(color.rgb, vec3(luma), crest * u_depth * 0.8);

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class SomaticPulseNode implements VideoNode {
  readonly nodeName = 'somatic_pulse'
  private material: ShaderMaterial | null = null
  private readonly envelope = new PulseEnvelope()
  private readonly surge: SurgeEnvelope
  private rateHz = 1
  private smoothing = 0.85
  /** Clamped surge controls; read by contract probes. */
  private surgeStrength = 0
  private surgeIntervalSec = 12

  constructor(random: FastRandom = fastRandom) {
    this.surge = new SurgeEnvelope(6, random)
  }

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    const resolved = resolvePulseParameters(params, 0.85)
    let tunnel = resolveNumberParam(params, 'tunnel', 0.3) * intensity
    let blur = resolveNumberParam(params, 'blur', 0.12) * intensity
    let surge = resolveNumberParam(params, 'surge', 0) * intensity
    tunnel = clamp(tunnel, 0, 0.75)
    blur = clamp(blur, 0, 0.35)
    surge = clamp(surge, 0, 1)

    if (params.safeMode) {
      tunnel = Math.min(tunnel, 0.5)
      blur = Math.min(blur, 0.22)
      surge = Math.min(surge, 0.6)
    }

    this.material.uniforms.u_depth.value = resolved.depth
    this.material.uniforms.u_pulse.value = this.envelope.current()
    this.material.uniforms.u_tunnel.value = tunnel
    this.material.uniforms.u_blur.value = blur
    updateTexelSize(this.material, this.material.uniforms.u_map.value as Texture)
    this.rateHz = resolved.rate
    this.smoothing = resolved.smoothing
    this.surgeStrength = surge
    this.surgeIntervalSec = clamp(resolveNumberParam(params, 'surge_interval', 12), 4, 30)

    applyUvParams(this.material, params)
  }

  tick(delta: number): void {
    if (!this.material) return
    this.material.uniforms.u_pulse.value = this.envelope.advance(
      delta,
      this.rateHz,
      this.smoothing,
      { tauScale: 0.7, minTau: 0.03, maxTau: 0.7 },
    )
    this.material.uniforms.u_surge.value = this.surge.advance(
      delta,
      this.surgeIntervalSec,
      this.surgeStrength,
    )
  }

  getMaterial(inputTexture: Texture): Material {
    this.material = getPulseMaterial(this.material, inputTexture, FRAG, {
      u_depth: { value: 0 },
      u_pulse: { value: 0.5 },
      u_surge: { value: 0 },
      u_tunnel: { value: 0.3 },
      u_blur: { value: 0.12 },
      u_texelSize: { value: new Vector2(1 / 400, 1 / 400) },
    })
    return this.material
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
