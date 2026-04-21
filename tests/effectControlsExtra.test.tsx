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
  it('renders fallback Intensity slider and Safe Mode toggle when profile is null', () => {
    render(<EffectControls {...defaultProps({ profile: null })} />)
    expect(screen.getByText('Intensity')).toBeTruthy()
    expect(screen.getByText('Safe Mode')).toBeTruthy()
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

  it('reflects audioEnabled=true on Audio toggle', () => {
    render(<EffectControls {...defaultProps({ audioEnabled: true })} />)
    const audioToggle = screen.getByLabelText('Audio') as HTMLInputElement
    expect(audioToggle.checked).toBe(true)
  })

  it('reflects audioEnabled=false on Audio toggle', () => {
    render(<EffectControls {...defaultProps({ audioEnabled: false })} />)
    const audioToggle = screen.getByLabelText('Audio') as HTMLInputElement
    expect(audioToggle.checked).toBe(false)
  })

  it('calls onAudioEnabledChange when Audio toggle is clicked', () => {
    const onAudioEnabledChange = vi.fn()
    render(<EffectControls {...defaultProps({ onAudioEnabledChange })} />)
    const audioToggle = screen.getByLabelText('Audio')
    fireEvent.click(audioToggle)
    expect(onAudioEnabledChange).toHaveBeenCalled()
  })

  it('calls onSafeModeChange when Safe Mode toggle is clicked (with profile)', () => {
    const onSafeModeChange = vi.fn()
    render(<EffectControls {...defaultProps({ onSafeModeChange })} />)
    const safeModeToggle = screen.getByLabelText('Safe Mode')
    fireEvent.click(safeModeToggle)
    expect(onSafeModeChange).toHaveBeenCalled()
  })

  it('calls onControlValuesChange when a param slider changes', () => {
    const onControlValuesChange = vi.fn()
    render(<EffectControls {...defaultProps({ onControlValuesChange })} />)
    // The LabeledSlider wraps input in <label>; find by role slider + look for Grain label
    const sliders = screen.getAllByRole('slider')
    // There should be at least 2 sliders (Intensity and Grain)
    expect(sliders.length).toBeGreaterThanOrEqual(2)
    fireEvent.change(sliders[sliders.length - 1], { target: { value: '0.8' } })
    expect(onControlValuesChange).toHaveBeenCalled()
  })

  it('renders profile controls (intensity slider from profile ui.controls)', () => {
    render(<EffectControls {...defaultProps()} />)
    // Check for label text rendered inside LabeledSlider <span>
    expect(screen.getByText('Intensity')).toBeTruthy()
    expect(screen.getByText('Grain')).toBeTruthy()
  })

  it('calls onReducedMotionChange when Reduced Motion toggle is clicked', () => {
    const onReducedMotionChange = vi.fn()
    render(<EffectControls {...defaultProps({ onReducedMotionChange })} />)
    const toggle = screen.getByLabelText('Reduced Motion')
    fireEvent.click(toggle)
    expect(onReducedMotionChange).toHaveBeenCalled()
  })
})
