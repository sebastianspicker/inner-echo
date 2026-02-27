import type { Profile } from './schema'

export const BASELINE_PROFILE: Profile = {
  id: 'none',
  label: 'None (Clean)',
  summary: 'No overlay. Baseline camera view.',
  framing: { type: 'baseline' },
  experience_dimensions: [],
  safety: {
    intensity_default: 0,
    intensity_max: 0,
    warnings: [],
    safe_mode_clamps: { max_intensity: 0 },
  },
  ui: { controls: [] },
  video_stack: [],
  audio_stack: { enabled: false },
  reactive: { analyser_to_params: [] },
  references: { dimensions: [] },
}

export function createComposeFallbackProfile(
  warning = 'Internal error: composed profile failed schema validation; falling back to clean profile.'
): Profile {
  return {
    ...BASELINE_PROFILE,
    id: 'composed_fallback',
    label: 'Composed Overlay (Fallback)',
    summary: 'Fallback profile used due to an internal validation error. No overlay is applied.',
    framing: {
      type: 'baseline',
      disclaimer: 'Fallback: composition failed validation; showing clean camera view.',
    },
    safety: {
      ...BASELINE_PROFILE.safety,
      warnings: [warning],
    },
  }
}
