import { Vector2, type Material, type ShaderMaterial, type Texture } from 'three'
import type { VideoNode, VideoNodeParams } from './VideoNode'
import { applyUvParams, clamp, resolveNumberParam } from './paramUtils'
import {
  bindInputTexture,
  createEffectMaterial,
  disposeEffectMaterial,
  updateTexelSize,
} from './shaderMaterial'

export abstract class SinglePassTexelNode implements VideoNode {
  abstract readonly nodeName: string
  protected abstract readonly fragment: string
  protected abstract readonly maxAmount: number
  private material: ShaderMaterial | null = null

  setParams(params: VideoNodeParams): void {
    if (!this.material) return
    const amount = clamp(
      resolveNumberParam(params, 'amount', 0) * clamp(params.intensity ?? 0, 0, 1),
      0,
      this.maxAmount,
    )
    this.material.uniforms.u_amount.value = amount
    updateTexelSize(this.material, this.material.uniforms.u_map.value as Texture)
    applyUvParams(this.material, params)
  }

  getMaterial(inputTexture: Texture): Material {
    if (!this.material) {
      this.material = createEffectMaterial(inputTexture, this.fragment, {
        u_amount: { value: 0 },
        u_texelSize: { value: new Vector2(1 / 400, 1 / 400) },
      })
    } else bindInputTexture(this.material, inputTexture)
    return this.material
  }

  dispose(): void {
    this.material = disposeEffectMaterial(this.material)
  }
}
