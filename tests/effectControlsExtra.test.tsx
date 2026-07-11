// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EffectControls } from '../src/ui/EffectControls'
import type { Profile } from '../src/conditions/schema'

function makeProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: 'fixture',
    label: 'Fixture',
    summary: 'Test fixture',
    framing: { type: 'metaphor' },
    experience_dimensions: [],
    safety: {
      intensity_default: 0.5,
      intensity_max: 1,
      warnings: [],
      safe_mode_clamps: {},
      reduced_motion_policy: { disable_nodes: [] },
    },
    video_stack: [{ id: 'grain', node: 'grain', params: {} }],
    audio_stack: { enabled: false },
    reactive: { analyser_to_params: [] },
    ui: {
      controls: [
        { id: 'intensity', type: 'slider', label: 'Intensity', min: 0, max: 1, step: 0.01 },
        { id: 'safe_mode', type: 'toggle', label: 'Safe Mode' },
        { id: 'reduced_motion', type: 'toggle', label: 'Reduced Motion' },
        { id: 'audio_enabled', type: 'toggle', label: 'Audio' },
        {
          id: 'grain_amount',
          type: 'slider',
          label: 'Grain',
          min: 0,
          max: 1,
          step: 0.01,
          target: 'video.grain.amount',
        },
      ],
    },
    references: { dimensions: [] },
    ...overrides,
  }
}

function defaultProps(overrides = {}) {
  return {
    profile: makeProfile(),
    intensity: 0.5,
    safeMode: false,
    stressMode: false,
    reducedMotion: false,
    audioEnabled: true,
    controlValues: {},
    onIntensityChange: vi.fn(),
    onSafeModeChange: vi.fn(),
    onStressModeChange: vi.fn(),
    onReducedMotionChange: vi.fn(),
    onAudioEnabledChange: vi.fn(),
    onControlValuesChange: vi.fn(),
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('ui/EffectControls – additional coverage', () => {
  it('does not duplicate global controls when profile is null', () => {
    render(<EffectControls {...defaultProps({ profile: null })} />)
    expect(screen.getByText(/no additional controls/i)).toBeTruthy()
    expect(screen.queryByText('Intensity')).toBeNull()
    expect(screen.queryByText('Safe Mode')).toBeNull()
  })

  it('renders Stress Mode toggle regardless of profile', () => {
    render(<EffectControls {...defaultProps({ profile: null })} />)
    expect(screen.getByText(/stress mode/i)).toBeTruthy()
  })

  it('renders Stress Mode toggle when profile is provided', () => {
    render(<EffectControls {...defaultProps()} />)
    expect(screen.getByText(/stress mode/i)).toBeTruthy()
  })

  it('calls onStressModeChange when Stress Mode toggle is clicked', () => {
    const onStressModeChange = vi.fn()
    render(<EffectControls {...defaultProps({ onStressModeChange })} />)
    const toggle = screen.getByLabelText(/stress mode/i)
    fireEvent.click(toggle)
    expect(onStressModeChange).toHaveBeenCalled()
  })

  it('calls onControlValuesChange when a param slider changes', () => {
    const onControlValuesChange = vi.fn()
    render(<EffectControls {...defaultProps({ onControlValuesChange })} />)
    // The LabeledSlider wraps input in <label>; find by role slider + look for Grain label
    const sliders = screen.getAllByRole('slider')
    expect(sliders).toHaveLength(1)
    fireEvent.change(sliders[sliders.length - 1], { target: { value: '0.8' } })
    expect(onControlValuesChange).toHaveBeenCalled()
  })

  it('renders only profile-specific controls', () => {
    render(<EffectControls {...defaultProps()} />)
    expect(screen.getByText('Grain')).toBeTruthy()
    expect(screen.queryByText('Intensity')).toBeNull()
    expect(screen.queryByText('Reduced Motion')).toBeNull()
    expect(screen.queryByText('Audio')).toBeNull()
  })
})
