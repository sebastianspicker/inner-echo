export const FPS_SAMPLES = 30
export const RENDER_SCALES = [1.0, 0.75, 0.5] as const
export const FPS_DOWN_THRESHOLD = 28
export const FPS_UP_THRESHOLD = 33
export const SCALE_CHANGE_COOLDOWN_MS = 900
/** A down-step this soon after an up-step marks the up-step as flapping. */
export const SCALE_FLAP_WINDOW_MS = 10_000
/** After a flapping down-step, up-steps stay blocked this long. */
export const SCALE_UP_BLOCK_MS = 30_000
/** Largest time step handed to node ticks, coupling and reactive callbacks (tab stalls, resumes). */
export const MAX_STEP_SECONDS = 0.1
/** Upper bound on effect-chain pixels per target (about 1080p) before DPR scaling is reduced. */
export const MAX_CHAIN_PIXELS = 2_000_000
/** Container size must hold still this long before internal targets are reallocated. */
export const RESIZE_SETTLE_MS = 120
/** Rendered frames between `gl.getError()` polls (each poll stalls the GPU pipeline). */
export const GL_ERROR_POLL_FRAMES = 30
