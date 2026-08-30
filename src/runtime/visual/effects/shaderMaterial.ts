import { ShaderMaterial, Vector2, type Texture } from 'three'
import { QUAD_VERTEX_SHADER } from './paramUtils'

type UniformValues = Record<string, { value: unknown }>

function isValidTextureDimension(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** Create the shared full-screen material shell while leaving node uniforms explicit. */
export function createEffectMaterial(
  inputTexture: Texture,
  fragmentShader: string,
  uniforms: UniformValues,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      u_map: { value: inputTexture },
      u_uvScale: { value: new Vector2(1, 1) },
      u_uvOffset: { value: new Vector2(0, 0) },
      ...uniforms,
    },
    vertexShader: QUAD_VERTEX_SHADER,
    fragmentShader,
    depthWrite: false,
  })
}

/** Rebind the current pass input whenever the pipeline reuses a node material. */
export function bindInputTexture(material: ShaderMaterial, inputTexture: Texture): void {
  material.uniforms.u_map.value = inputTexture
}

/** Temporal nodes use their current input when the previous frame is unavailable. */
export function bindPreviousTexture(
  material: ShaderMaterial,
  inputTexture: Texture,
  previousFrameTexture?: Texture | null,
): void {
  material.uniforms.u_prev.value = previousFrameTexture ?? inputTexture
}

/** Dispose safely and return the reset value used by each node's material field. */
export function disposeEffectMaterial(material: ShaderMaterial | null): null {
  material?.dispose()
  return null
}

/** Keep texel-dependent kernels resolution-aware, with the established 400px fallback. */
export function updateTexelSize(material: ShaderMaterial, texture: Texture): void {
  const image = texture.image as { width?: unknown; height?: unknown } | undefined
  const width = isValidTextureDimension(image?.width) ? image.width : 400
  const height = isValidTextureDimension(image?.height) ? image.height : 400
  const texelSize = material.uniforms.u_texelSize?.value
  if (texelSize instanceof Vector2) texelSize.set(1 / width, 1 / height)
}
