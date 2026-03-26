import { clamp } from '../../utils/numeric'
import type { VideoNodeParams } from './VideoNode'

export { clamp }

/**
 * Standard vertex shader shared by all full-screen quad effect nodes.
 * Passes UV coordinates to the fragment shader; positions the quad to fill clip space.
 */
export const QUAD_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/** Material with optional UV uniforms (u_uvScale, u_uvOffset as Vector2-like). */
interface MaterialWithUvUniforms {
  uniforms: {
    u_uvScale?: { value: { set: (x: number, y: number) => void } }
    u_uvOffset?: { value: { set: (x: number, y: number) => void } }
  }
}

/** Apply uvScale and uvOffset from params to material uniforms when present and valid. */
export function applyUvParams(material: MaterialWithUvUniforms, params: VideoNodeParams): void {
  if (Array.isArray(params.uvScale) && params.uvScale.length >= 2) {
    material.uniforms.u_uvScale?.value?.set(params.uvScale[0], params.uvScale[1])
  }
  if (Array.isArray(params.uvOffset) && params.uvOffset.length >= 2) {
    material.uniforms.u_uvOffset?.value?.set(params.uvOffset[0], params.uvOffset[1])
  }
}

/** Read a finite number from an unknown record-like object; avoids unsafe casts at call sites. */
function getNumberFromRecord(obj: unknown, key: string): number | undefined {
  if (obj == null || typeof obj !== 'object') return undefined
  const v = (obj as Record<string, unknown>)[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

export function resolveNumberParam(
  params: VideoNodeParams,
  key: string,
  fallback: number
): number {
  const controlValues = params.controlValues ?? {}
  const nodeIndex = params.nodeIndex ?? 0
  const k = `${nodeIndex}.${key}`
  const v = controlValues[k]
  if (typeof v === 'number') return v
  const v2 = controlValues[key]
  if (typeof v2 === 'number') return v2
  return fallback
}

export function resolveBooleanParam(
  params: VideoNodeParams,
  key: string,
  fallback: boolean
): boolean {
  const controlValues = params.controlValues ?? {}
  const nodeIndex = params.nodeIndex ?? 0
  const k = `${nodeIndex}.${key}`
  const v = controlValues[k]
  if (typeof v === 'boolean') return v
  const v2 = controlValues[key]
  if (typeof v2 === 'boolean') return v2
  return fallback
}

export function getGlobalClampNumber(
  params: VideoNodeParams,
  key: string,
  fallback: number
): number {
  return getNumberFromRecord(params.safetyContext?.global, key) ?? fallback
}

export function getSafeModeClampNumber(
  params: VideoNodeParams,
  key: string,
  fallback: number
): number {
  return getNumberFromRecord(params.safetyContext?.safeMode, key) ?? fallback
}

