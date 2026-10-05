/**
 * Sparse swell scheduler for the profile synth: a quiet third-harmonic partial that
 * rises and fades every few seconds so delay and reverb have something to ring on.
 */

const SWELL_PEAK = 0.14
const SWELL_ATTACK_S = 0.6
const SWELL_END_S = 3.2

export interface SwellScheduler {
  /** (Re)start swells at the given interval; creates the partial on first use. */
  start(intervalSeconds: number, baseFrequency: number): void
  stop(): void
  setBaseFrequency(baseFrequency: number, now: number): void
  dispose(): void
}

export function createSwellScheduler(context: BaseAudioContext, output: GainNode): SwellScheduler {
  let osc: OscillatorNode | null = null
  let gain: GainNode | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const stop = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  const fire = () => {
    if (!gain) return
    const now = context.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(SWELL_PEAK, now + SWELL_ATTACK_S)
    gain.gain.linearRampToValueAtTime(0, now + SWELL_END_S)
  }

  const schedule = (intervalSeconds: number, factor: number) => {
    stop()
    timer = setTimeout(
      () => {
        fire()
        schedule(intervalSeconds, 0.75 + 0.5 * Math.random())
      },
      intervalSeconds * factor * 1000,
    )
  }

  return {
    start(intervalSeconds, baseFrequency) {
      stop()
      if (intervalSeconds <= 0) return
      if (!osc) {
        osc = context.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = baseFrequency * 3
        gain = context.createGain()
        gain.gain.value = 0
        osc.connect(gain)
        gain.connect(output)
        osc.start(0)
      }
      schedule(intervalSeconds, 0.5)
    },
    stop,
    setBaseFrequency(baseFrequency, now) {
      osc?.frequency.setValueAtTime(baseFrequency * 3, now)
    },
    dispose() {
      stop()
      if (osc) {
        try {
          osc.stop()
        } catch {
          // already stopped
        }
        osc.disconnect()
      }
      gain?.disconnect()
    },
  }
}
