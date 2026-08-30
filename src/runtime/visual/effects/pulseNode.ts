/**
 * SSOT: pulse: smooth, low-frequency envelope (no strobe).
 * Params: depth, rate, smoothing.
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
import { advancePulsePhase, smoothPulseValue } from './pulseOscillator'
import { bindInputTexture, createEffectMaterial, disposeEffectMaterial } from './shaderMaterial'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_depth;
uniform float u_pulse;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 color = texture2D(u_map, uv);

  // Pulse is 0..1; center it around 0 with a gentle brightness modulation.
  float centered = (u_pulse - 0.5) * 2.0;
  float gain = 1.0 + centered * u_depth;
  color.rgb *= gain;

  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class PulseNode implements VideoNode {
  readonly nodeName = 'pulse'
  private material: ShaderMaterial | null = null
  private phase = 0
  private smoothed = 0.5
  private rateHz = 1
  private smoothing = 0.9

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)

    let depth = resolveNumberParam(params, 'depth', 0) * intensity
    let rate = resolveNumberParam(params, 'rate', 1.0)
    const smoothing = clamp(resolveNumberParam(params, 'smoothing', 0.9), 0, 0.999)

    const globalMaxPulseDepth = getGlobalClampNumber(params, 'max_pulse_depth', 0.18)
    depth = clamp(depth, 0, clamp(globalMaxPulseDepth, 0, 1))
    const globalMaxHz = getGlobalClampNumber(params, 'max_flash_hz', 3)
    rate = clamp(rate, 0.05, clamp(globalMaxHz, 0.1, 10))

    if (params.safeMode) {
      const maxPulse = getSafeModeClampNumber(params, 'max_pulse_depth', globalMaxPulseDepth)
      depth = Math.min(depth, clamp(maxPulse, 0, 1))
      const maxHz = getSafeModeClampNumber(params, 'max_flash_hz', globalMaxHz)
      rate = Math.min(rate, clamp(maxHz, 0.1, 10))
    }

    this.material.uniforms.u_depth.value = depth
    this.material.uniforms.u_pulse.value = this.smoothed

    applyUvParams(this.material, params)

    this.rateHz = rate
    this.smoothing = smoothing
  }

  tick(delta: number): void {
    if (!this.material) return
    this.phase = advancePulsePhase(this.phase, delta, this.rateHz)
    this.smoothed = smoothPulseValue(
      this.phase,
      this.smoothed,
      delta,
      this.smoothing,
      0.6,
      0.02,
      0.6,
    )
    this.material.uniforms.u_pulse.value = this.smoothed
  }

  getMaterial(inputTexture: Texture): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, FRAG, {
        u_depth: { value: 0 },
        u_pulse: { value: 0.5 },
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
