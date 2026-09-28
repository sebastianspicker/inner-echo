import { GLOBAL_SAFETY_CLAMPS } from '../../domain/experience/safetyLimits'

/** Per-channel digital sample bound, not a true-peak or acoustic-volume guarantee. */
export function createOutputGuard(context: BaseAudioContext): WaveShaperNode {
  const guard = context.createWaveShaper()
  const limit = 10 ** (GLOBAL_SAFETY_CLAMPS.audio_ceiling_dbfs / 20)
  const knee = limit * 0.75
  const curve = new Float32Array(8193)
  for (let index = 0; index < curve.length; index += 1) {
    const input = (index * 2) / (curve.length - 1) - 1
    const magnitude = Math.abs(input)
    // Preserve quiet audio linearly; approach the ceiling smoothly above the knee.
    const output =
      magnitude <= knee
        ? magnitude
        : knee + (limit - knee) * Math.tanh((magnitude - knee) / (limit - knee))
    curve[index] = Math.sign(input) * output
  }
  guard.curve = curve
  // No resampling filter after the nonlinearity: it could introduce overshoot.
  guard.oversample = 'none'
  return guard
}
