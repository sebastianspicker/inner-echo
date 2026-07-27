/**
 * Temporal smear: blends with the previous frame using feedback and optional jitter.
 * Uses ping-pong RenderTargets managed by the pipeline; this node only provides the material.
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

export class TemporalSmearNode implements VideoNode {
  readonly nodeName = 'temporal_smear'
  readonly needsPreviousFrame = true
  private material: ShaderMaterial | null = null
  private time = 0

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const { feedback, jitter, decay } = resolveTemporalBlendParameters(
      params,
      'max_temporal_feedback',
    )
    this.material.uniforms.u_feedback.value = feedback
    this.material.uniforms.u_decay.value = decay
    const jx = Math.sin(this.time * 12.3) * jitter
    const jy = Math.sin(this.time * 7.7) * jitter
    this.material.uniforms.u_jitter.value.set(jx, jy)
    applyUvParams(this.material, params)
  }

  getMaterial(inputTexture: Texture, previousFrameTexture?: Texture | null): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, TEMPORAL_BLEND_FRAGMENT, {
        u_prev: { value: previousFrameTexture ?? inputTexture },
        u_feedback: { value: 0.5 },
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
    this.time = (this.time + delta) % 1000
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
