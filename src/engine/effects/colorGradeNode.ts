/**
 * SSOT: color_grade — gentle contrast/saturation/brightness/color-balance adjustments.
 * Safety: clamp contrast and chroma; never strobe.
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
uniform float u_contrast;
uniform float u_saturation;
uniform float u_brightness;
uniform float u_temperature;
uniform float u_tint;
varying vec2 vUv;

float ieLuma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 color = texture2D(u_map, uv);

  // Contrast around mid-gray.
  color.rgb = (color.rgb - 0.5) * (1.0 + u_contrast) + 0.5;

  // Saturation: blend towards luminance.
  float l = ieLuma(color.rgb);
  vec3 gray = vec3(l);
  // u_saturation is additive: negative desaturates, positive saturates.
  color.rgb = mix(gray, color.rgb, 1.0 + u_saturation);

  // Brightness offset.
  color.rgb += u_brightness;

  // Gentle color balance: temperature warms/cools, tint shifts green/magenta.
  color.rgb += vec3(
    u_temperature * 0.16 - u_tint * 0.06,
    u_tint * 0.12,
    -u_temperature * 0.16 - u_tint * 0.06
  );

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class ColorGradeNode implements VideoNode {
  readonly nodeName = 'color_grade'
  private material: ShaderMaterial | null = null

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)

    // SSOT params: small, user-controlled grade and color-balance adjustments.
    let contrast = resolveNumberParam(params, 'contrast', 0) * intensity
    let saturation = resolveNumberParam(params, 'saturation', 0) * intensity
    let brightness = resolveNumberParam(params, 'brightness', 0) * intensity
    let temperature = resolveNumberParam(params, 'temperature', 0) * intensity
    let tint = resolveNumberParam(params, 'tint', 0) * intensity

    const globalMaxContrast = getGlobalClampNumber(params, 'max_global_contrast', 0.25)
    contrast = clamp(contrast, -Math.abs(globalMaxContrast), Math.abs(globalMaxContrast))
    if (params.safeMode) {
      const safeMaxContrast = getSafeModeClampNumber(params, 'max_contrast', globalMaxContrast)
      contrast = clamp(contrast, -Math.abs(safeMaxContrast), Math.abs(safeMaxContrast))
    }

    // These do not have explicit SSOT clamp keys; keep conservative.
    saturation = clamp(saturation, -0.7, 0.25)
    brightness = clamp(brightness, -0.12, 0.12)
    temperature = clamp(temperature, -1, 1)
    tint = clamp(tint, -1, 1)

    this.material.uniforms.u_contrast.value = contrast
    this.material.uniforms.u_saturation.value = saturation
    this.material.uniforms.u_brightness.value = brightness
    this.material.uniforms.u_temperature.value = temperature
    this.material.uniforms.u_tint.value = tint
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
        u_contrast: { value: 0 },
        u_saturation: { value: 0 },
        u_brightness: { value: 0 },
        u_temperature: { value: 0 },
        u_tint: { value: 0 },
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
