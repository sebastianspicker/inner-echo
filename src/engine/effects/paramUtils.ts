import type { VideoNodeParams } from './VideoNode'

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
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
  const v = (params.safetyContext?.global as Record<string, unknown> | undefined)?.[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

export function getSafeModeClampNumber(
  params: VideoNodeParams,
  key: string,
  fallback: number
): number {
  const v = (params.safetyContext?.safeMode as Record<string, unknown> | undefined)?.[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

