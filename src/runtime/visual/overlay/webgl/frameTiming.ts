import {
  FPS_DOWN_THRESHOLD,
  FPS_SAMPLES,
  FPS_UP_THRESHOLD,
  GL_ERROR_POLL_FRAMES,
  RENDER_SCALES,
  SCALE_CHANGE_COOLDOWN_MS,
  SCALE_FLAP_WINDOW_MS,
  SCALE_UP_BLOCK_MS,
} from './constants'
import { computeNextRenderScaleIndex, type RenderScaleDecision } from './loop'
import type { WebGLOverlayRuntimeState } from './pipelineState'

export function computeScaleIndex(
  state: WebGLOverlayRuntimeState,
  now: number,
): RenderScaleDecision {
  const stressMode = import.meta.env.DEV && Boolean(state.currentParams.stressMode)
  return computeNextRenderScaleIndex({
    currentIndex: state.renderScaleIndex,
    scaleCount: RENDER_SCALES.length,
    avgFps: state.avgFps,
    stressMode,
    prevStressMode: state.prevStressMode,
    nowMs: now,
    lastScaleChangeMs: state.lastScaleChangeMs,
    cooldownMs: SCALE_CHANGE_COOLDOWN_MS,
    downThreshold: FPS_DOWN_THRESHOLD,
    upThreshold: FPS_UP_THRESHOLD,
    lastUpStepMs: state.lastUpStepMs,
    upStepBlockedUntilMs: state.upStepBlockedUntilMs,
    flapWindowMs: SCALE_FLAP_WINDOW_MS,
    upBlockMs: SCALE_UP_BLOCK_MS,
  })
}

export function updateFrameTiming(state: WebGLOverlayRuntimeState, now: number): number {
  let delta = (now - state.lastTime) / 1000
  state.lastTime = now
  if (import.meta.env.DEV && state.currentParams.stressMode && delta < 0.05)
    delta = burnStressFrame(delta)
  if (delta > 0 && delta < 1) {
    state.frameTimes.push(delta)
    if (state.frameTimes.length > FPS_SAMPLES) state.frameTimes.shift()
    state.avgFps =
      1 / (state.frameTimes.reduce((total, item) => total + item, 0) / state.frameTimes.length)
  }
  return delta
}

function burnStressFrame(delta: number): number {
  const start = performance.now()
  while (performance.now() < start + 25) {}
  return Math.max(0, delta - (performance.now() - start) / 1000)
}

/**
 * `gl.getError()` forces a GPU sync, so it is polled on the first three rendered frames and then
 * every `GL_ERROR_POLL_FRAMES`. Three consecutive polls with errors trigger the fallback.
 */
export function hasRepeatedGlErrors(
  gl: WebGLRenderingContext,
  state: WebGLOverlayRuntimeState,
  didRender: boolean,
): boolean {
  if (!didRender) return false
  state.renderedFrameCount += 1
  const frame = state.renderedFrameCount
  if (frame > 3 && frame % GL_ERROR_POLL_FRAMES !== 0) return false
  let hadError = false
  for (let error = gl.getError(); error !== gl.NO_ERROR; error = gl.getError()) hadError = true
  state.consecutiveGlErrors = hadError ? state.consecutiveGlErrors + 1 : 0
  return state.consecutiveGlErrors >= 3
}
