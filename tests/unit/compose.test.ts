import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import type { Profile } from '../../src/conditions/schema'
import type { SelectedPreset } from '../../src/composer/types'
import { createComposerSettings } from '../helpers/composerFixtures'
import { makeTestProfile } from '../helpers/profileFixtures'

// Minimal valid profile for testing
const MINIMAL_PROFILE: Profile = makeTestProfile({
  id: 'test',
  summary: 'Test profile for compose.ts tests.',
  video_stack: [{ id: 'grain', node: 'grain', params: { amount: 0.2 } }],
  audio_stack: { enabled: false },
})

const DEFAULT_SETTINGS = createComposerSettings()

const PRESET: SelectedPreset = { profileId: 'test', weight: 1 }

function mockComposeDependencies(profile: Profile): void {
  vi.doMock('../../src/conditions/loader', () => ({
    loadProfile: vi.fn().mockResolvedValue(profile),
  }))
  vi.doMock('../../src/composer/dimensionToSignalMapping', () => ({
    getDimensionMappingEntry: vi.fn().mockReturnValue(null),
  }))
  vi.doMock('../../src/composer/experienceDimensions', () => ({
    getExperienceDimensions: vi.fn().mockReturnValue([]),
  }))
}

describe('composer/compose (runtime entrypoint)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a valid profile for a happy-path preset', async () => {
    // Mock the loader so no Vite import.meta.glob is needed in tests
    mockComposeDependencies(MINIMAL_PROFILE)

    const { composeEffectiveProfile } = await import('../../src/composer/compose')
    const result = await composeEffectiveProfile([PRESET], [], DEFAULT_SETTINGS)

    expect(result.profile).toBeDefined()
    expect(typeof result.profile.id).toBe('string')
    expect(result.report).toBeDefined()
  })

  it('returns a fallback profile when the composed result fails schema validation', async () => {
    // Return a profile missing required fields so profileSchema.safeParse fails
    const badProfile = { id: 'bad' } as unknown as Profile
    mockComposeDependencies(badProfile)

    // Override composeEffectiveProfileCore to return a profile that fails schema
    vi.doMock('../../src/composer/composeCore', () => ({
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

    const { composeEffectiveProfile } = await import('../../src/composer/compose')
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
