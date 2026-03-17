/**
 * Phase 6: Temporal smear — blends with previous frame (feedback) + optional jitter.
 * Uses ping-pong RenderTargets managed by the pipeline; this node only provides the material.
 */

import * as THREE from 'three'
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
uniform sampler2D u_prev;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_feedback;
uniform float u_decay;
uniform vec2 u_jitter;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec2 juv = uv + u_jitter;
  vec4 curr = texture2D(u_map, uv);
  vec4 prev = texture2D(u_prev, juv);
  float w = clamp(u_feedback * u_decay, 0.0, 1.0);
  vec4 color = mix(curr, prev, w);
  gl_FragColor = clamp(color, 0.0, 1.0);
}
`

export class TemporalSmearNode implements VideoNode {
  readonly nodeName = 'temporal_smear'
  readonly needsPreviousFrame = true
  private material: THREE.ShaderMaterial | null = null
  private time = 0

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let feedback = resolveNumberParam(params, 'feedback', 0) * intensity
    let jitter = resolveNumberParam(params, 'jitter', 0) * intensity
    const decay = clamp(resolveNumberParam(params, 'decay', 0.94), 0.85, 0.99)

    const globalMaxFeedback = getGlobalClampNumber(params, 'max_feedback', 0.18)
    const globalMaxJitter = getGlobalClampNumber(params, 'max_jitter', 0.06)
    feedback = clamp(feedback, 0, clamp(globalMaxFeedback, 0, 1))
    jitter = clamp(jitter, 0, clamp(globalMaxJitter, 0, 0.25))

    if (params.safeMode) {
      const maxFeedback = getSafeModeClampNumber(params, 'max_temporal_feedback', globalMaxFeedback)
      const maxJitter = getSafeModeClampNumber(params, 'max_jitter', globalMaxJitter)
      feedback = Math.min(feedback, clamp(maxFeedback, 0, 1))
      jitter = Math.min(jitter, clamp(maxJitter, 0, 0.25))
    }
    this.material.uniforms.u_feedback.value = feedback
    this.material.uniforms.u_decay.value = decay
    const jx = (Math.sin(this.time * 12.3) * 0.5 + 0.5) * jitter
    const jy = (Math.sin(this.time * 7.7) * 0.5 + 0.5) * jitter
    this.material.uniforms.u_jitter.value.set(jx, jy)
    applyUvParams(this.material, params)
  }

  getMaterial(
    inputTexture: THREE.Texture,
    previousFrameTexture?: THREE.Texture | null
  ): THREE.Material {
    if (this.material) {
      this.material.uniforms.u_map.value = inputTexture
      this.material.uniforms.u_prev.value = previousFrameTexture ?? inputTexture
      return this.material
    }
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_map: { value: inputTexture },
        u_prev: { value: previousFrameTexture ?? inputTexture },
        u_uvScale: { value: new THREE.Vector2(1, 1) },
        u_uvOffset: { value: new THREE.Vector2(0, 0) },
        u_feedback: { value: 0.5 },
        u_decay: { value: 0.94 },
        u_jitter: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: QUAD_VERTEX_SHADER,
      fragmentShader: FRAG,
      depthWrite: false,
    })
    return this.material
  }

  tick(delta: number): void {
    this.time += delta
  }

  dispose(): void {
    if (this.material) {
      this.material.dispose()
      this.material = null
    }
  }
}
