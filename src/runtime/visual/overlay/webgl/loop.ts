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
  /** Time of the last up-step (more resolution); negative infinity when none happened. */
  lastUpStepMs: number
  upStepBlockedUntilMs: number
  flapWindowMs: number
  upBlockMs: number
}

export interface RenderScaleDecision {
  index: number
  lastUpStepMs: number
  upStepBlockedUntilMs: number
}

export function computeNextRenderScaleIndex(input: RenderScaleDecisionInput): RenderScaleDecision {
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
    lastUpStepMs,
    upStepBlockedUntilMs,
    flapWindowMs,
    upBlockMs,
  } = input
  const keep = { index: currentIndex, lastUpStepMs, upStepBlockedUntilMs }

  // When stress mode is toggled off, immediately reset to full resolution so
  // the render scale can recover without waiting for FPS to climb back up.
  if (prevStressMode && !stressMode) return { ...keep, index: 0 }

  if (nowMs - lastScaleChangeMs < cooldownMs) return keep

  if (stressMode || avgFps < downThreshold) {
    if (currentIndex >= scaleCount - 1) return keep
    const flapped = !stressMode && nowMs - lastUpStepMs < flapWindowMs
    return {
      ...keep,
      index: currentIndex + 1,
      upStepBlockedUntilMs: flapped ? nowMs + upBlockMs : upStepBlockedUntilMs,
    }
  }

  if (avgFps > upThreshold && currentIndex > 0 && nowMs >= upStepBlockedUntilMs) {
    return { ...keep, index: currentIndex - 1, lastUpStepMs: nowMs }
  }

  return keep
}
