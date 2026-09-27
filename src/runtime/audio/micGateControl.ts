import { clamp01, smoothStep } from '../../shared/numbers'
import type { MicLifecycleOptions, MicrophoneGraph } from './micTypes'

type MicGateControlOptions = Pick<
  MicLifecycleOptions,
  'getContext' | 'isDisposed' | 'sampleMicRms'
> & {
  getGraph: () => MicrophoneGraph
  getGate: () => number
}

export function createMicGateControl(options: MicGateControlOptions) {
  let gateSmoothed = 1
  let gateIntervalId: ReturnType<typeof setInterval> | null = null
  let lastGateTickMs: number | null = null
  const stop = (): void => {
    if (gateIntervalId) clearInterval(gateIntervalId)
    gateIntervalId = null
    lastGateTickMs = null
  }
  const applyEnvelope = (micRms: number, deltaSec: number): void => {
    const gateGain = options.getGraph().gateGain
    if (!gateGain) return
    const threshold = clamp01(options.getGate()) * 0.08
    const raw = clamp01((micRms - threshold) / 0.02)
    gateSmoothed = smoothStep(gateSmoothed, raw * raw, deltaSec, 0.04, 0.18)
    gateGain.gain.setValueAtTime(clamp01(gateSmoothed), options.getContext()?.currentTime ?? 0)
  }
  const start = (): void => {
    if (gateIntervalId) return
    lastGateTickMs = nowMs()
    gateIntervalId = setInterval(() => {
      const graph = options.getGraph()
      if (options.isDisposed() || !graph.analyser || !graph.gateGain) return
      const now = nowMs()
      const deltaSec =
        lastGateTickMs == null ? 1 / 30 : Math.max(0.001, (now - lastGateTickMs) / 1000)
      lastGateTickMs = now
      applyEnvelope(options.sampleMicRms(graph.analyser), deltaSec)
    }, 50)
  }
  return {
    start,
    stop,
    reset(): void {
      gateSmoothed = 1
    },
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}
