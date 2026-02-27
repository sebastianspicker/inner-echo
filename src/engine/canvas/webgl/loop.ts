export interface RenderScaleDecisionInput {
  currentIndex: number
  scaleCount: number
  avgFps: number
  stressMode: boolean
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
    nowMs,
    lastScaleChangeMs,
    cooldownMs,
    downThreshold,
    upThreshold,
  } = input

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
