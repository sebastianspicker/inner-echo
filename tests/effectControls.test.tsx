// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EffectControls } from '../src/ui/EffectControls'
import type { Profile } from '../src/conditions/schema'

function makeProfile(): Profile {
  return {
    id: 'effect-controls-fixture',
    label: 'Effect Controls Fixture',
    summary: 'Fixture profile for EffectControls tests',
    framing: { type: 'metaphor' },
    experience_dimensions: [],
    safety: {
      intensity_default: 0.5,
      intensity_max: 1,
      warnings: [],
      safe_mode_clamps: {},
      reduced_motion_policy: { disable_nodes: ['pulse'] },
    },
    video_stack: [
      { id: 'pulse', node: 'pulse', params: { depth: 0.09 } },
      { id: 'grain', node: 'grain', params: { amount: 0.18 } },
    ],
    audio_stack: { enabled: false, chain: [] },
    reactive: { analyser_to_params: [] },
    ui: {
      controls: [
        { id: 'intensity', type: 'slider', label: 'Intensity', min: 0, max: 1, step: 0.01 },
        {
          id: 'pulse_depth',
          type: 'slider',
          label: 'Wave Depth',
          min: 0,
          max: 1,
          step: 0.01,
          target: 'video.pulse.depth',
        },
        {
          id: 'grain_amount',
          type: 'slider',
          label: 'Grain Amount',
          min: 0,
          max: 1,
          step: 0.01,
          target: 'video.grain.amount',
        },
      ],
    },
    references: { dimensions: [] },
  }
}

afterEach(() => {
  cleanup()
})

describe('ui/EffectControls', () => {
  it('renders only controls that remain valid under reduced motion', () => {
    render(
      <EffectControls
        profile={makeProfile()}
        intensity={0.5}
        safeMode={false}
        stressMode={false}
        reducedMotion={true}
        audioEnabled={false}
        controlValues={{ '0.amount': 0.18 }}
        onIntensityChange={vi.fn()}
        onSafeModeChange={vi.fn()}
        onStressModeChange={vi.fn()}
        onReducedMotionChange={vi.fn()}
        onAudioEnabledChange={vi.fn()}
        onControlValuesChange={vi.fn()}
      />,
    )

    expect(screen.queryByText('Intensity')).toBeNull()
    expect(screen.getByText('Grain Amount')).toBeTruthy()
    expect(screen.queryByText('Wave Depth')).toBeNull()
  })
})
