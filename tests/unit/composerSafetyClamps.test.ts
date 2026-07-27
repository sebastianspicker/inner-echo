import { describe, expect, it } from 'vitest'

import { composeEffectiveProfileCore } from '../../src/composer/composeCore'
import type { Profile } from '../../src/conditions/schema'

const BASE_PROFILE: Profile = {
  id: 'synthetic',
  label: 'Synthetic',
  summary: 'Synthetic preset for clamp regression checks.',
  framing: { type: 'metaphor' },
  experience_dimensions: [],
  safety: {
    intensity_default: 0.6,
    intensity_max: 1,
    warnings: ['Synthetic warning'],
    safe_mode_clamps: {
      max_feedback: 0.18,
      max_jitter: 0.06,
      max_pulse_depth: 0.18,
      max_chroma: 0.12,
      max_tremolo_rate_hz: 4,
      max_tremolo_depth: 0.15,
      max_noise_level: 0.08,
    },
    reduced_motion_policy: {
      disable_nodes: ['temporal_smear'],
    },
  },
  video_stack: [
    { id: 'temporal', node: 'temporal_smear', params: { feedback: 1, jitter: 0.2, decay: 0.95 } },
    { id: 'loop', node: 'feedback_loop', params: { feedback: 1, jitter: 0.2, decay: 0.95 } },
  ],
  audio_stack: {
    enabled: true,
    input: 'synth',
    master: { volume: 0.2 },
    chain: [
      { id: 'delay', node: 'delay', params: { time: 0.14, feedback: 0.18, mix: 0.1 } },
      { id: 'tremolo', node: 'tremolo', params: { rate: 4, depth: 0.15 } },
    ],
  },
  reactive: { analyser_to_params: [] },
  ui: { controls: [] },
  references: { dimensions: [] },
}

describe('composer safety clamp regressions', () => {
  it('forces feedback-style params to zero when maxFeedback is zero', async () => {
    const res = await composeEffectiveProfileCore(
      [{ profileId: 'synthetic', weight: 1 }],
      [],
      {
        intensity: 0.5,
        safeMode: true,
        reducedMotion: false,
        audioEnabled: true,
        micEnabled: false,
        couplingStrength: 0.5,
        maxFeedback: 0,
        interactionAmount: 0.15,
        debugOverlay: false,
      },
      {
        async loadPresetProfile(profileId: string) {
          return profileId === 'synthetic' ? BASE_PROFILE : null
        },
        getDimensionMappingEntry() {
          return null
        },
        getExperienceDimensions() {
          return []
        },
      },
    )

    const temporal = res.profile.video_stack.find((n) => n.node === 'temporal_smear')
    const feedbackLoop = res.profile.video_stack.find((n) => n.node === 'feedback_loop')
    const delay = res.profile.audio_stack?.chain?.find((n) => n.node === 'delay')

    expect((temporal?.params?.feedback as number) ?? -1).toBe(0)
    expect((feedbackLoop?.params?.feedback as number) ?? -1).toBe(0)
    expect((delay?.params?.feedback as number) ?? -1).toBe(0)
  })
})
