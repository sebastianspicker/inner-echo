/**
 * Haze: a pale, low-contrast veil whose density drifts very slowly (about 0.03 Hz) at large
 * scale, so it reads as fog in the room rather than a flat wash. The drift is far below any
 * motion that Reduced Motion needs to remove.
 */

import type { ShaderMaterial, Material, Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams, clamp, resolveNumberParam } from './paramUtils'
import { bindInputTexture, createEffectMaterial, disposeEffectMaterial } from './shaderMaterial'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
uniform float u_time;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 color = texture2D(u_map, uv);

  // Two octaves of slow, large-scale density drift (about +-15% of the amount).
  float drift = valueNoise(vUv * 2.5 + vec2(u_time * 0.03, -u_time * 0.02));
  drift += 0.5 * valueNoise(vUv * 5.0 - vec2(u_time * 0.025, u_time * 0.035));
  float density = u_amount * (0.85 + 0.3 * (drift / 1.5 - 0.5));

  // Fine dither keeps the veil free of banding.
  float dither = (hash(vUv * 213.7 + u_time * 0.1) - 0.5) * 0.02;
  vec3 veil = vec3(0.66, 0.68, 0.71) + dither;
  color.rgb = mix(color.rgb, veil, clamp(density, 0.0, 1.0));

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class HazeNode implements VideoNode {
  readonly nodeName = 'haze'
  private material: ShaderMaterial | null = null
  private time = 0

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    amount = clamp(amount, 0, 0.4)
    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_time.value = this.time
    applyUvParams(this.material, params)
  }

  tick(delta: number): void {
    this.time = (this.time + delta) % 1000
  }

  getMaterial(inputTexture: Texture): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, FRAG, {
        u_amount: { value: 0 },
        u_time: { value: 0 },
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
