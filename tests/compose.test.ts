import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import type { Profile } from '../src/conditions/schema'
import type { ComposerSettings, SelectedPreset } from '../src/composer/types'

// Minimal valid profile for testing
const MINIMAL_PROFILE: Profile = {
  id: 'test',
  label: 'Test Profile',
  summary: 'Test profile for compose.ts tests.',
  framing: { type: 'metaphor' },
  experience_dimensions: [],
  safety: {
    intensity_default: 0.5,
    intensity_max: 1,
    warnings: [],
    safe_mode_clamps: {},
    reduced_motion_policy: { disable_nodes: [] },
  },
  video_stack: [{ id: 'grain', node: 'grain', params: { amount: 0.2 } }],
  audio_stack: { enabled: false },
  reactive: { analyser_to_params: [] },
  ui: { controls: [] },
  references: { dimensions: [] },
}

const DEFAULT_SETTINGS: ComposerSettings = {
  intensity: 0.5,
  safeMode: false,
  reducedMotion: false,
  audioEnabled: false,
  micEnabled: false,
  couplingStrength: 0,
  maxFeedback: 1,
  interactionAmount: 0,
  debugOverlay: false,
}

const PRESET: SelectedPreset = { profileId: 'test', weight: 1 }

describe('composer/compose (runtime entrypoint)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a valid profile for a happy-path preset', async () => {
    // Mock the loader so no Vite import.meta.glob is needed in tests
    vi.doMock('../src/conditions/loader', () => ({
      loadProfile: vi.fn().mockResolvedValue(MINIMAL_PROFILE),
    }))
    vi.doMock('../src/composer/dimensionToSignalMapping', () => ({
      getDimensionMappingEntry: vi.fn().mockReturnValue(null),
    }))
    vi.doMock('../src/composer/experienceDimensions', () => ({
      getExperienceDimensions: vi.fn().mockReturnValue([]),
    }))

    const { composeEffectiveProfile } = await import('../src/composer/compose')
    const result = await composeEffectiveProfile([PRESET], [], DEFAULT_SETTINGS)

    expect(result.profile).toBeDefined()
    expect(typeof result.profile.id).toBe('string')
    expect(result.report).toBeDefined()
  })

  it('returns a fallback profile when the composed result fails schema validation', async () => {
    // Return a profile missing required fields so profileSchema.safeParse fails
    const badProfile = { id: 'bad' } as unknown as Profile
    vi.doMock('../src/conditions/loader', () => ({
      loadProfile: vi.fn().mockResolvedValue(badProfile),
    }))
    vi.doMock('../src/composer/dimensionToSignalMapping', () => ({
      getDimensionMappingEntry: vi.fn().mockReturnValue(null),
    }))
    vi.doMock('../src/composer/experienceDimensions', () => ({
      getExperienceDimensions: vi.fn().mockReturnValue([]),
    }))

    // Override composeEffectiveProfileCore to return a profile that fails schema
    vi.doMock('../src/composer/composeCore', () => ({
      composeEffectiveProfileCore: vi.fn().mockResolvedValue({
        profile: { id: 'composed', label: 'X' }, // missing required fields
        report: {
          missingNodes: { video: [], audio: [] },
          missingPresets: [],
          evidence: { dimensions: [], gaps: [] },
          warnings: [],
        },
      }),
    }))

    const { composeEffectiveProfile } = await import('../src/composer/compose')
    const result = await composeEffectiveProfile([PRESET], [], DEFAULT_SETTINGS)

    // Should fall back to fallback profile
    expect(result.profile.id).toBe('composed_fallback')
    expect(
      result.report.warnings.some(
        (w) =>
          w.includes('schema validation') || w.includes('fallback') || w.includes('validation'),
      ),
    ).toBe(true)
  })
})
