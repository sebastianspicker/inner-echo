import type { FastRandom } from './random'
import { clamp } from './paramUtils'

const RISE_SECONDS = 1.5
const HOLD_SECONDS = 0.8
const RELEASE_SECONDS = 3.5

function smooth(t: number): number {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

/**
 * Sparse rise, crest and release envelope for wave-like effects. Surges start at
 * irregular intervals (0.7..1.3 of the configured interval), rise over 1.5 s, hold briefly
 * and release over 3.5 s, so the change is always slow and never a flash.
 */
export class SurgeEnvelope {
  private untilNext: number
  /** Seconds since the current surge started, or -1 while idle. */
  private elapsed = -1

  constructor(
    initialDelaySeconds: number,
    private readonly random: FastRandom = Math.random,
  ) {
    this.untilNext = Math.max(0, initialDelaySeconds)
  }

  /** Advances by `delta` seconds and returns the surge level 0..strength. */
  advance(delta: number, intervalSeconds: number, strength: number): number {
    if (strength <= 0) {
      this.elapsed = -1
      return 0
    }
    if (this.elapsed < 0) {
      this.untilNext -= Math.max(0, delta)
      if (this.untilNext > 0) return 0
      this.elapsed = 0
    }
    this.elapsed += Math.max(0, delta)
    const level = this.shape(this.elapsed)
    if (level === null) {
      this.elapsed = -1
      this.untilNext = intervalSeconds * (0.7 + 0.6 * this.random())
      return 0
    }
    return level * strength
  }

  private shape(elapsed: number): number | null {
    if (elapsed < RISE_SECONDS) return smooth(elapsed / RISE_SECONDS)
    if (elapsed < RISE_SECONDS + HOLD_SECONDS) return 1
    const releaseElapsed = elapsed - RISE_SECONDS - HOLD_SECONDS
    if (releaseElapsed < RELEASE_SECONDS) return 1 - smooth(releaseElapsed / RELEASE_SECONDS)
    return null
  }
}
