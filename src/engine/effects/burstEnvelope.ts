import type { FastRandom } from '../../utils/fastRandom'
import { clamp } from './paramUtils'

function easeInOut(t: number): number {
  const x = clamp(t, 0, 1)
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2
}

/** Convert the remaining burst time into the existing smooth triangle envelope. */
export function burstEnvelope(remaining: number, duration: number): number {
  const progress = 1 - remaining / Math.max(0.001, duration)
  const triangle = progress < 0.5 ? progress * 2 : (1 - progress) * 2
  return easeInOut(triangle)
}

/** Shared non-strobing burst scheduler; subclasses retain policy-specific configuration. */
export abstract class BurstEnvelopeState {
  protected burstTimer = 0
  protected burstGapTimer = 0
  protected burstProbPerSec = 0

  protected constructor(
    protected burstDuration: number,
    protected burstMinGap: number,
    private readonly random: FastRandom = Math.random,
  ) {}

  protected tickBurstEnvelope(delta: number): number {
    if (this.burstGapTimer > 0) {
      this.burstGapTimer = Math.max(0, this.burstGapTimer - delta)
    }

    if (this.burstTimer > 0) {
      this.burstTimer = Math.max(0, this.burstTimer - delta)
      if (this.burstTimer === 0) {
        this.burstGapTimer = this.burstMinGap
        return 0
      }
      return burstEnvelope(this.burstTimer, this.burstDuration)
    }

    if (this.burstGapTimer <= 0 && this.burstProbPerSec > 0) {
      const probability = clamp(this.burstProbPerSec * delta, 0, 0.5)
      if (this.random() < probability) this.burstTimer = this.burstDuration
    }
    return 0
  }
}
