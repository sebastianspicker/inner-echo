/**
 * SSOT: pulse — smooth, low-frequency envelope (no strobe).
 * Params: depth, rate, smoothing.
 */

import * as THREE from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import {
  clamp,
  getGlobalClampNumber,
  getSafeModeClampNumber,
  resolveNumberParam,
} from './paramUtils'

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

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
  private material: THREE.ShaderMaterial | null = null
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

    if (params.uvScale) {
      this.material.uniforms.u_uvScale.value.set(params.uvScale[0], params.uvScale[1])
    }
    if (params.uvOffset) {
      this.material.uniforms.u_uvOffset.value.set(params.uvOffset[0], params.uvOffset[1])
    }

    this.rateHz = rate
    this.smoothing = smoothing
  }

  tick(delta: number): void {
    if (!this.material) return
    this.phase += delta * this.rateHz * Math.PI * 2
    // Target in 0..1.
    const target = Math.sin(this.phase) * 0.5 + 0.5
    // Map smoothing (0..1) to a time constant: higher smoothing -> slower change.
    const tau = clamp((1 - this.smoothing) * 0.6, 0.02, 0.6)
    const t = 1 - Math.exp(-delta / tau)
    this.smoothed = this.smoothed + (target - this.smoothed) * t
    this.material.uniforms.u_pulse.value = this.smoothed
  }

  getMaterial(inputTexture: THREE.Texture): THREE.Material {
    if (this.material) {
      this.material.uniforms.u_map.value = inputTexture
      return this.material
    }
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_map: { value: inputTexture },
        u_uvScale: { value: new THREE.Vector2(1, 1) },
        u_uvOffset: { value: new THREE.Vector2(0, 0) },
        u_depth: { value: 0 },
        u_pulse: { value: 0.5 },
      },
      vertexShader: VERT,
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

