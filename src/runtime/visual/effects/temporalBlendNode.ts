import { Vector2, type Material, type ShaderMaterial, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams } from './paramUtils'
import {
  bindInputTexture,
  bindPreviousTexture,
  createEffectMaterial,
  disposeEffectMaterial,
} from './shaderMaterial'
import {
  MAX_PERSISTENCE_SECONDS,
  persistenceBlend,
  persistenceSeconds,
  recurrenceWave,
  resolveTemporalBlendParameters,
  TEMPORAL_BLEND_FRAGMENT,
} from './temporalBlend'

type TemporalBlendNodeConfig = {
  feedbackLimit: 'max_feedback' | 'max_temporal_feedback'
  /** Persistence time constant at the reference feedback value. */
  tauMaxSeconds: number
  /** Extra persistence (as a multiple of tau) at the top of the recurrence wave; 0 disables it. */
  recurrenceBoost: number
  recurrencePeriodSeconds: number
}

/**
 * Previous-frame blend with a frame-rate-independent persistence time constant. The
 * `feedback` parameter stays bounded by the feedback clamps; it selects how long an
 * afterimage lingers rather than a raw per-frame mix weight.
 */
export abstract class TemporalBlendNode implements VideoNode {
  abstract readonly nodeName: string
  readonly needsPreviousFrame = true
  protected abstract readonly config: TemporalBlendNodeConfig
  private material: ShaderMaterial | null = null
  private time = 0
  private feedback = 0
  private decay = 0.94
  private jitter = 0

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const resolved = resolveTemporalBlendParameters(params, this.config.feedbackLimit)
    this.feedback = resolved.feedback
    this.decay = resolved.decay
    this.jitter = resolved.jitter
    this.material.uniforms.u_feedback.value = resolved.feedback
    this.material.uniforms.u_decay.value = resolved.decay
    this.writeJitter()
    applyUvParams(this.material, params)
  }

  getMaterial(inputTexture: Texture, previousFrameTexture?: Texture | null): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, TEMPORAL_BLEND_FRAGMENT, {
        u_prev: { value: previousFrameTexture ?? inputTexture },
        u_feedback: { value: 0 },
        u_decay: { value: 0.94 },
        u_blend: { value: 0 },
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
    if (!this.material) return
    let tau = persistenceSeconds(this.feedback, this.decay, this.config.tauMaxSeconds)
    if (this.config.recurrenceBoost > 0) {
      tau *=
        1 +
        this.config.recurrenceBoost * recurrenceWave(this.time, this.config.recurrencePeriodSeconds)
    }
    tau = Math.min(tau, MAX_PERSISTENCE_SECONDS)
    this.material.uniforms.u_blend.value = persistenceBlend(tau, delta)
    this.writeJitter()
  }

  /** The retained frame drifts slowly (well under 1 Hz) by up to half the jitter clamp. */
  private writeJitter(): void {
    if (!this.material) return
    this.material.uniforms.u_jitter.value.set(
      Math.sin(this.time * 0.9) * this.jitter * 0.5,
      Math.sin(this.time * 0.7 + 1.3) * this.jitter * 0.5,
    )
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
