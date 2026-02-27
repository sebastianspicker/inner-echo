export interface UvScaleOffset {
  uvScale: [number, number]
  uvOffset: [number, number]
}

function toFiniteNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isFinite(entry[1])
    )
  )
}

export function computeUvScaleOffset(vw: number, vh: number, cw: number, ch: number): UvScaleOffset {
  if (vw <= 0 || vh <= 0 || cw <= 0 || ch <= 0) {
    return { uvScale: [1, 1], uvOffset: [0, 0] }
  }

  const videoAspect = vw / vh
  const canvasAspect = cw / ch
  const scale =
    canvasAspect >= videoAspect
      ? [1, canvasAspect / videoAspect]
      : [videoAspect / canvasAspect, 1]

  return {
    uvScale: [1 / scale[0], 1 / scale[1]],
    uvOffset: [(1 - 1 / scale[0]) * 0.5, (1 - 1 / scale[1]) * 0.5],
  }
}

export function resolveReactiveOverrides(overridesRaw: unknown): {
  video: Record<string, number>
  audio: Record<string, number> | null
} {
  if (overridesRaw && typeof overridesRaw === 'object' && 'video' in overridesRaw) {
    const structured = overridesRaw as { video?: unknown; audio?: unknown }
    const video = toFiniteNumberRecord(structured.video)
    const audioRecord = toFiniteNumberRecord(structured.audio)
    return {
      video,
      audio: Object.keys(audioRecord).length > 0 ? audioRecord : null,
    }
  }

  return {
    video: toFiniteNumberRecord(overridesRaw),
    audio: null,
  }
}

export function mergeControlValues(
  base: Record<string, number | boolean>,
  videoOverrides: Record<string, number>
): Record<string, number | boolean> {
  return {
    ...base,
    ...videoOverrides,
  }
}

export function writeMergedControlValues(
  target: Record<string, number | boolean>,
  base: Record<string, number | boolean>,
  videoOverrides: Record<string, number>
): void {
  for (const key of Object.keys(target)) delete target[key]
  Object.assign(target, base, videoOverrides)
}
