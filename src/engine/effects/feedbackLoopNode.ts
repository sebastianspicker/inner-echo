/**
 * SSOT: feedback_loop: gentle recursion (temporal), with strict clamps.
 * Params: decay, feedback, jitter.
 */

import { ShaderMaterial, Vector2, type Material, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams } from './paramUtils'
import {
  bindInputTexture,
  bindPreviousTexture,
  createEffectMaterial,
  disposeEffectMaterial,
} from './shaderMaterial'
import { resolveTemporalBlendParameters, TEMPORAL_BLEND_FRAGMENT } from './temporalBlend'

export class FeedbackLoopNode implements VideoNode {
  readonly nodeName = 'feedback_loop'
  readonly needsPreviousFrame = true
  private material: ShaderMaterial | null = null
  private time = 0

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const { feedback, jitter, decay } = resolveTemporalBlendParameters(params, 'max_feedback')

    this.material.uniforms.u_feedback.value = feedback
    // Note: decay stays >= 0.85 even when intensity (and thus feedback) is 0.
    // This is functionally benign because the shader blend weight is feedback * decay,
    // which is already 0 when feedback is 0.
    this.material.uniforms.u_decay.value = decay
    const jx = Math.sin(this.time * 9.1) * jitter
    const jy = Math.sin(this.time * 6.4) * jitter
    this.material.uniforms.u_jitter.value.set(jx, jy)

    applyUvParams(this.material, params)
  }

  getMaterial(inputTexture: Texture, previousFrameTexture?: Texture | null): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, TEMPORAL_BLEND_FRAGMENT, {
        u_prev: { value: previousFrameTexture ?? inputTexture },
        u_feedback: { value: 0 },
        u_decay: { value: 0.94 },
        u_jitter: { value: new Vector2(0, 0) },
      })
    } else {
      bindInputTexture(this.material, inputTexture)
      bindPreviousTexture(this.material, inputTexture, previousFrameTexture)
    }
    return this.material
  }

  tick(delta: number): void {
    this.time += delta
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
