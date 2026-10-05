/**
 * Pure intensity scaling for profile audio parameters. Intensity 0 maps every scaled
 * parameter to a neutral value (silent noise, open filters, dry mixes); intensity 1
 * returns the authored value. Compressor and timing parameters are never scaled.
 */

export const LOWPASS_OPEN_HZ = 12000
export const HIGHPASS_OPEN_HZ = 50

const LINEAR_PARAMS = new Set([
  'noise_bed.level',
  'lowpass.sweep_depth',
  'tremolo.depth',
  'flutter.depth',
  'delay.mix',
  'delay.feedback',
  'reverb.mix',
  'pulse_tone.mix',
])

function normalizeIntensity(intensity: number): number {
  if (!Number.isFinite(intensity)) return 1
  return Math.max(0, Math.min(1, intensity))
}

export function scaleAudioParam(
  node: string,
  param: string,
  value: number,
  intensity: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value
  const i = normalizeIntensity(intensity)
  const nodeKey = String(node).toLowerCase()
  const key = `${nodeKey}.${param}`
  if (LINEAR_PARAMS.has(key)) return value * i
  if (key === 'lowpass.cutoff') {
    const v = Math.max(1, Math.min(LOWPASS_OPEN_HZ, value))
    return LOWPASS_OPEN_HZ * (v / LOWPASS_OPEN_HZ) ** i
  }
  if (key === 'highpass.cutoff') {
    return HIGHPASS_OPEN_HZ * (Math.max(value, HIGHPASS_OPEN_HZ) / HIGHPASS_OPEN_HZ) ** i
  }
  return value
}

export function scaleAudioParams(
  node: string,
  params: Record<string, unknown>,
  intensity: number,
): Record<string, unknown> {
  const scaled: Record<string, unknown> = {}
  for (const [param, value] of Object.entries(params)) {
    scaled[param] =
      typeof value === 'number' ? scaleAudioParam(node, param, value, intensity) : value
  }
  return scaled
}
