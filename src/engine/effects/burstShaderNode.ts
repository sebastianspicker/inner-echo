import { ShaderMaterial, type Material, type Texture } from 'three'
import type { FastRandom } from '../../utils/fastRandom'
import { BurstEnvelopeState } from './burstEnvelope'
import type { VideoNodeParams } from './VideoNode'
import {
  applyUvParams,
  clamp,
  getGlobalClampNumber,
  getSafeModeClampNumber,
  resolveNumberParam,
} from './paramUtils'
import { bindInputTexture, createEffectMaterial, disposeEffectMaterial } from './shaderMaterial'

type UniformValues = Record<string, { value: unknown }>

interface BoundedControlPolicy {
  fallback: number
  min: number
  max: number
}

interface BurstShaderPolicy {
  amountCap: number
  safeModeAmountFactor: number
  probability: BoundedControlPolicy
  durationMs: BoundedControlPolicy
  minGapMs: BoundedControlPolicy
}

interface BurstShaderConfig {
  fragmentShader: string
  uniforms: () => UniformValues
  syncTimeUniform: boolean
  burstPolicy: BurstShaderPolicy
}

/**
 * Shared shader material and burst-envelope lifecycle for sparse burst effects.
 * Subclasses retain shader-specific uniforms and optional pre-envelope hooks.
 */
export abstract class BurstShaderNode extends BurstEnvelopeState {
  private material: ShaderMaterial | null = null
  private time = 0

  protected constructor(
    burstDuration: number,
    burstMinGap: number,
    private readonly shaderConfig: BurstShaderConfig,
    random?: FastRandom,
  ) {
    super(burstDuration, burstMinGap, random)
  }

  getMaterial(inputTexture: Texture): Material {
    if (!this.material) {
      this.material = createEffectMaterial(
        inputTexture,
        this.shaderConfig.fragmentShader,
        this.shaderConfig.uniforms(),
      )
    } else {
      bindInputTexture(this.material, inputTexture)
    }
    return this.material
  }

  tick(delta: number): void {
    if (!this.material) return
    this.time = (this.time + delta) % 1000
    if (this.shaderConfig.syncTimeUniform) this.material.uniforms.u_time.value = this.time
    this.beforeTickBurstEnvelope(delta)
    this.material.uniforms.u_burst.value = this.tickBurstEnvelope(delta)
  }

  /** Apply the shared safety, burst scheduling, and UV policy before node-specific uniforms. */
  protected applyBurstShaderParams(params: VideoNodeParams): ShaderMaterial | null {
    if (!this.material) return null
    const { burstPolicy } = this.shaderConfig
    const intensity = clamp(params.intensity ?? 0, 0, 1)
    let amount = resolveNumberParam(params, 'amount', 0) * intensity
    const probability = resolveNumberParam(
      params,
      'burst_probability',
      burstPolicy.probability.fallback,
    )
    const durationMs = resolveNumberParam(
      params,
      'burst_duration_ms',
      burstPolicy.durationMs.fallback,
    )
    const minGapMs = resolveNumberParam(params, 'burst_min_gap_ms', burstPolicy.minGapMs.fallback)

    const globalMax = getGlobalClampNumber(params, 'max_luminance_delta_per_frame', 0.25)
    amount = clamp(amount, 0, Math.min(burstPolicy.amountCap, globalMax))
    if (params.safeMode) {
      const maxIntensity = getSafeModeClampNumber(params, 'max_intensity', 1)
      amount = Math.min(amount, burstPolicy.safeModeAmountFactor * clamp(maxIntensity, 0, 1))
    }

    this.material.uniforms.u_amount.value = amount
    this.material.uniforms.u_time.value = this.time
    this.burstProbPerSec = clamp(
      probability,
      burstPolicy.probability.min,
      burstPolicy.probability.max,
    )
    this.burstDuration = clamp(
      durationMs / 1000,
      burstPolicy.durationMs.min / 1000,
      burstPolicy.durationMs.max / 1000,
    )
    this.burstMinGap = clamp(
      minGapMs / 1000,
      burstPolicy.minGapMs.min / 1000,
      burstPolicy.minGapMs.max / 1000,
    )
    applyUvParams(this.material, params)
    return this.material
  }

  protected beforeTickBurstEnvelope(_delta: number): void {}

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
