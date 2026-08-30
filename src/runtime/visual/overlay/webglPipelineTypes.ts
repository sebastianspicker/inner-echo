/** Params the UI can set (intensity, Safe Mode, per-node control values, optional stress test). */
export interface VideoPipelineParams {
  intensity: number
  safeMode: boolean
  /** Keyed by control id or "nodeIndex.param" (e.g. "0.amount", "1.feedback"). */
  controlValues?: Record<string, number | boolean>
  /**
   * SSOT safety context (global clamps + profile safe-mode clamps).
   * Shape is intentionally minimal to avoid importing condition-layer types into engine.
   */
  safetyContext?: {
    global: Record<string, unknown>
    safeMode: Record<string, unknown>
  }
  /** When true, artificially lower FPS simulation for testing the performance guard. */
  stressMode?: boolean
}
