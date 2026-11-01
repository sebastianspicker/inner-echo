export interface OverrideScratch {
  video: Record<string, number>
  audio: Record<string, number>
}

export function createOverrideScratch(): OverrideScratch {
  return { video: {}, audio: {} }
}

/** Copies finite numbers into `out`, clearing it first; returns whether any key was written. */
function writeFiniteNumberRecord(out: Record<string, number>, value: unknown): boolean {
  for (const key of Object.keys(out)) delete out[key]
  if (!value || typeof value !== 'object') return false
  let written = false
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'number' && Number.isFinite(item)) {
      out[key] = item
      written = true
    }
  }
  return written
}

/**
 * Write UV scale/offset into pre-allocated tuples to avoid per-frame allocations.
 */
export function writeUvScaleOffset(
  vw: number,
  vh: number,
  cw: number,
  ch: number,
  outScale: [number, number],
  outOffset: [number, number],
): void {
  if (vw <= 0 || vh <= 0 || cw <= 0 || ch <= 0) {
    outScale[0] = 1
    outScale[1] = 1
    outOffset[0] = 0
    outOffset[1] = 0
    return
  }
  const videoAspect = vw / vh
  const canvasAspect = cw / ch
  let sx: number, sy: number
  if (canvasAspect >= videoAspect) {
    sx = 1
    sy = canvasAspect / videoAspect
  } else {
    sx = videoAspect / canvasAspect
    sy = 1
  }
  outScale[0] = 1 / sx
  outScale[1] = 1 / sy
  outOffset[0] = (1 - 1 / sx) * 0.5
  outOffset[1] = (1 - 1 / sy) * 0.5
}

const NO_OVERRIDES = { video: null, audio: null }

/** Returned records are the scratch objects: valid until the next call. Null means no overrides. */
export function resolveReactiveOverrides(
  overridesRaw: unknown,
  scratch: OverrideScratch,
): { video: Record<string, number> | null; audio: Record<string, number> | null } {
  if (!overridesRaw || typeof overridesRaw !== 'object' || !('video' in overridesRaw)) {
    return NO_OVERRIDES
  }
  const structured = overridesRaw as { video?: unknown; audio?: unknown }
  return {
    video: writeFiniteNumberRecord(scratch.video, structured.video) ? scratch.video : null,
    audio: writeFiniteNumberRecord(scratch.audio, structured.audio) ? scratch.audio : null,
  }
}

export function writeMergedControlValues(
  target: Record<string, number | boolean>,
  base: Record<string, number | boolean>,
  videoOverrides: Record<string, number>,
): void {
  for (const key of Object.keys(target)) delete target[key]
  Object.assign(target, base, videoOverrides)
}
