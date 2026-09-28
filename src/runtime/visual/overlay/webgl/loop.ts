export interface RenderScaleDecisionInput {
  currentIndex: number
  scaleCount: number
  avgFps: number
  stressMode: boolean
  /** Whether stress mode was active on the previous frame. */
  prevStressMode: boolean
  nowMs: number
  lastScaleChangeMs: number
  cooldownMs: number
  downThreshold: number
  upThreshold: number
}

export function computeNextRenderScaleIndex(input: RenderScaleDecisionInput): number {
  const {
    currentIndex,
    scaleCount,
    avgFps,
    stressMode,
    prevStressMode,
    nowMs,
    lastScaleChangeMs,
    cooldownMs,
    downThreshold,
    upThreshold,
  } = input

  // When stress mode is toggled off, immediately reset to full resolution so
  // the render scale can recover without waiting for FPS to climb back up.
  if (prevStressMode && !stressMode) {
    return 0
  }

  if (nowMs - lastScaleChangeMs < cooldownMs) {
    return currentIndex
  }

  if (stressMode || avgFps < downThreshold) {
    return Math.min(currentIndex + 1, scaleCount - 1)
  }

  if (!stressMode && avgFps > upThreshold) {
    return Math.max(0, currentIndex - 1)
  }

  return currentIndex
}
