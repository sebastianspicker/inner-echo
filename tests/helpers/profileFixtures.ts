import type { Profile } from '../../src/conditions/schema'

export function makeTestProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'test-profile',
    label: 'Test Profile',
    summary: 'A test profile.',
    framing: { type: 'metaphor' },
    experience_dimensions: [],
    safety: {
      intensity_default: 0.5,
      intensity_max: 1,
      warnings: [],
      safe_mode_clamps: {},
      reduced_motion_policy: { disable_nodes: [] },
    },
    video_stack: [],
    audio_stack: { enabled: false, chain: [] },
    reactive: { analyser_to_params: [] },
    ui: { controls: [] },
    references: { dimensions: [] },
    ...overrides,
  }
}
