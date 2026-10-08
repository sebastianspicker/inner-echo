export const FPS_SAMPLES = 30
export const RENDER_SCALES = [1.0, 0.75, 0.5] as const
export const FPS_DOWN_THRESHOLD = 28
export const FPS_UP_THRESHOLD = 33
export const SCALE_CHANGE_COOLDOWN_MS = 900
/** Upper bound on effect-chain pixels per target (about 1080p) before DPR scaling is reduced. */
export const MAX_CHAIN_PIXELS = 2_000_000
/** Container size must hold still this long before internal targets are reallocated. */
export const RESIZE_SETTLE_MS = 120
/** Rendered frames between `gl.getError()` polls (each poll stalls the GPU pipeline). */
export const GL_ERROR_POLL_FRAMES = 30
