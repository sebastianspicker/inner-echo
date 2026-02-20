/**
 * Global Engine Safety Limits (Single Source of Truth)
 * 
 * This module defines the absolute maximum permissible values for various
 * high-risk visual and audio effects within the entire Inner Echo application.
 * 
 * Purpose:
 * To protect users from potentially harmful sensory experiences, such as:
 * - High-frequency flashing (seizure risk)
 * - Extreme volumes (hearing damage)
 * - Intense visual chaos (nausea / vertigo)
 * 
 * These global limits are baked into the application's engine and act as a hard 
 * ceiling. Individual condition profiles can request lower limits (via `safety.safe_mode_clamps`), 
 * but they can NEVER exceed these global defaults.
 */
export interface GlobalSafetyClamps {
  no_strobe: boolean
  max_flash_hz: number
  max_luminance_delta_per_frame: number
  max_global_contrast: number
  max_chroma: number
  max_feedback: number
  max_jitter: number
  max_pulse_depth: number
  audio_ceiling_dbfs: number
  max_tremolo_rate_hz: number
  max_tremolo_depth: number
  max_noise_level: number
}

export const GLOBAL_SAFETY_CLAMPS: GlobalSafetyClamps = {
  no_strobe: true,
  max_flash_hz: 3,
  max_luminance_delta_per_frame: 0.25,
  max_global_contrast: 0.25,
  max_chroma: 0.12,
  max_feedback: 0.18,
  max_jitter: 0.06,
  max_pulse_depth: 0.18,
  audio_ceiling_dbfs: -6,
  max_tremolo_rate_hz: 4,
  max_tremolo_depth: 0.15,
  max_noise_level: 0.08,
}

