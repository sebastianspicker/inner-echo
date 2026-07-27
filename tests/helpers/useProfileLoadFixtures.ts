import type { Profile } from '../../src/conditions/schema'
import type { UseProfileLoadParams } from '../../src/ui/hooks/useProfileLoad'

export function makeProfile(id: string): Profile {
  return {
    id,
    label: id,
    summary: id,
    framing: { type: 'metaphor' },
    experience_dimensions: [],
    video_stack: [{ node: 'grain', params: { amount: 0.1 } }],
    safety: {
      intensity_default: 0.5,
      intensity_max: 1,
      warnings: [],
      safe_mode_clamps: {},
    },
    audio_stack: {
      enabled: true,
      input: 'synth',
      master: { volume: 0.2 },
      chain: [{ node: 'noise_bed', params: { level: 0.02 } }],
    },
    reactive: { analyser_to_params: [] },
    ui: { controls: [] },
    references: { dimensions: [] },
  }
}

export function makeParams(overrides: Partial<UseProfileLoadParams> = {}): UseProfileLoadParams {
  return {
    conditionId: 'anxiety',
    composerMode: 'preset',
    selectedPresets: [],
    selectedDimensions: [],
    setIntensity: () => undefined,
    intensity: 0.5,
    safeMode: false,
    reducedMotion: false,
    audioEnabled: true,
    maxFeedback: 0.35,
    interactionAmount: 0.15,
    ...overrides,
  }
}
