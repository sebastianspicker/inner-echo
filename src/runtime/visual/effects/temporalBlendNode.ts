import { Vector2, type Material, type ShaderMaterial, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams } from './paramUtils'
import {
  bindInputTexture,
  bindPreviousTexture,
  createEffectMaterial,
  disposeEffectMaterial,
} from './shaderMaterial'
import { resolveTemporalBlendParameters, TEMPORAL_BLEND_FRAGMENT } from './temporalBlend'

type TemporalBlendNodeConfig = {
  feedbackLimit: 'max_feedback' | 'max_temporal_feedback'
  jitterX: number
  jitterY: number
  initialFeedback: number
  wrapAt?: number
}

export abstract class TemporalBlendNode implements VideoNode {
  abstract readonly nodeName: string
  readonly needsPreviousFrame = true
  protected abstract readonly config: TemporalBlendNodeConfig
  private material: ShaderMaterial | null = null
  private time = 0

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const { feedback, jitter, decay } = resolveTemporalBlendParameters(
      params,
      this.config.feedbackLimit,
    )
    this.material.uniforms.u_feedback.value = feedback
    this.material.uniforms.u_decay.value = decay
    this.material.uniforms.u_jitter.value.set(
      Math.sin(this.time * this.config.jitterX) * jitter,
      Math.sin(this.time * this.config.jitterY) * jitter,
    )
    applyUvParams(this.material, params)
  }

  getMaterial(inputTexture: Texture, previousFrameTexture?: Texture | null): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, TEMPORAL_BLEND_FRAGMENT, {
        u_prev: { value: previousFrameTexture ?? inputTexture },
        u_feedback: { value: this.config.initialFeedback },
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
    if (this.config.wrapAt) this.time %= this.config.wrapAt
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
