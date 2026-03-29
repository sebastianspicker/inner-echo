import { describe, expect, it } from 'vitest'

import { composeEffectiveProfileCore, type ComposeSources } from '../src/composer/composeCore'
import type { Profile } from '../src/conditions/schema'
import type {
  ComposerSettings,
  DimensionSignalMappingEntry,
  ExperienceDimensionDef,
} from '../src/composer/types'

const MINIMAL_PROFILE: Profile = {
  id: 'minimal',
  label: 'Minimal',
  summary: 'Minimal profile for testing.',
  framing: { type: 'metaphor' },
  experience_dimensions: [],
  safety: {
    intensity_default: 0.5,
    intensity_max: 1,
    warnings: ['Test warning'],
    safe_mode_clamps: {},
    reduced_motion_policy: { disable_nodes: [] },
  },
  video_stack: [
    { id: 'grain', node: 'grain', params: { amount: 0.3 } },
    { id: 'vignette', node: 'vignette', params: { amount: 0.4 } },
  ],
  audio_stack: {
    enabled: true,
    input: 'synth',
    master: { volume: 0.5 },
    chain: [{ id: 'tremolo', node: 'tremolo', params: { rate: 3, depth: 0.1 } }],
  },
  reactive: { analyser_to_params: [] },
  ui: { controls: [] },
  references: { dimensions: [] },
}

const DEFAULT_SETTINGS: ComposerSettings = {
  intensity: 0.5,
  safeMode: false,
  reducedMotion: false,
  audioEnabled: true,
  micEnabled: false,
  couplingStrength: 0.5,
  maxFeedback: 1,
  interactionAmount: 0,
  debugOverlay: false,
}

function makeSources(profiles: Record<string, Profile>): ComposeSources {
  return {
    async loadPresetProfile(profileId: string) {
      return profiles[profileId] ?? null
    },
    getDimensionMappingEntry() {
      return null
    },
    getExperienceDimensions() {
      return []
    },
  }
}

describe('composer/composeCore', () => {
  it('composeEffectiveProfileCore with a single preset produces valid profile', async () => {
    const result = await composeEffectiveProfileCore(
      [{ profileId: 'minimal', weight: 1 }],
      [],
      DEFAULT_SETTINGS,
      makeSources({ minimal: MINIMAL_PROFILE }),
    )

    expect(result.profile).toBeDefined()
    expect(result.profile.id).toBe('composed')
    expect(result.profile.video_stack).toBeDefined()
    expect(Array.isArray(result.profile.video_stack)).toBe(true)
    expect(result.profile.video_stack.length).toBeGreaterThan(0)
    expect(result.profile.safety).toBeDefined()
    expect(result.report).toBeDefined()
    expect(result.report.missingPresets).toHaveLength(0)
  })

  it('output has video_stack and safety properties', async () => {
    const result = await composeEffectiveProfileCore(
      [{ profileId: 'minimal', weight: 1 }],
      [],
      DEFAULT_SETTINGS,
      makeSources({ minimal: MINIMAL_PROFILE }),
    )

    // video_stack should contain the nodes from the profile
    const nodeNames = result.profile.video_stack.map((n) => n.node)
    expect(nodeNames).toContain('grain')
    expect(nodeNames).toContain('vignette')

    // safety should have mandatory fields
    expect(result.profile.safety.intensity_default).toBeDefined()
    expect(result.profile.safety.intensity_max).toBeDefined()
    expect(Array.isArray(result.profile.safety.warnings)).toBe(true)
    expect(result.profile.safety.safe_mode_clamps).toBeDefined()
  })

  it('composeEffectiveProfileCore with empty presets and dimensions returns fallback', async () => {
    const result = await composeEffectiveProfileCore([], [], DEFAULT_SETTINGS, makeSources({}))

    expect(result.profile).toBeDefined()
    expect(result.profile.id).toBe('composed')
    expect(result.profile.video_stack).toBeDefined()
    expect(Array.isArray(result.profile.video_stack)).toBe(true)
    expect(result.profile.video_stack).toHaveLength(0)
    expect(result.profile.safety).toBeDefined()
    expect(result.report.missingPresets).toHaveLength(0)
  })

  it('reports missing presets when profile is not found', async () => {
    const result = await composeEffectiveProfileCore(
      [{ profileId: 'nonexistent', weight: 1 }],
      [],
      DEFAULT_SETTINGS,
      makeSources({}),
    )

    expect(result.report.missingPresets).toContain('nonexistent')
    expect(result.profile.video_stack).toHaveLength(0)
  })

  it('audio_stack reflects audioEnabled setting', async () => {
    const result = await composeEffectiveProfileCore(
      [{ profileId: 'minimal', weight: 1 }],
      [],
      { ...DEFAULT_SETTINGS, audioEnabled: false },
      makeSources({ minimal: MINIMAL_PROFILE }),
    )

    expect(result.profile.audio_stack?.enabled).toBe(false)
  })

  it('filters out zero-weight presets', async () => {
    const result = await composeEffectiveProfileCore(
      [{ profileId: 'minimal', weight: 0 }],
      [],
      DEFAULT_SETTINGS,
      makeSources({ minimal: MINIMAL_PROFILE }),
    )

    // A zero-weight preset should be filtered out before loading
    expect(result.profile.video_stack).toHaveLength(0)
    expect(result.report.missingPresets).toHaveLength(0)
  })

  describe('multimorbid mode (two presets with different weights)', () => {
    const PROFILE_A: Profile = {
      ...MINIMAL_PROFILE,
      id: 'profile-a',
      label: 'Profile A',
      video_stack: [{ id: 'grain', node: 'grain', params: { amount: 0.2 } }],
      audio_stack: {
        enabled: true,
        input: 'synth',
        master: { volume: 0.4 },
        chain: [{ id: 'tremolo', node: 'tremolo', params: { rate: 2, depth: 0.1 } }],
      },
    }

    const PROFILE_B: Profile = {
      ...MINIMAL_PROFILE,
      id: 'profile-b',
      label: 'Profile B',
      video_stack: [
        { id: 'grain', node: 'grain', params: { amount: 0.8 } },
        { id: 'vignette', node: 'vignette', params: { amount: 0.6 } },
      ],
      audio_stack: {
        enabled: true,
        input: 'synth',
        master: { volume: 0.8 },
        chain: [{ id: 'tremolo', node: 'tremolo', params: { rate: 6, depth: 0.3 } }],
      },
    }

    it('blends two presets weighted by their contribution', async () => {
      const result = await composeEffectiveProfileCore(
        [
          { profileId: 'profile-a', weight: 0.3 },
          { profileId: 'profile-b', weight: 0.7 },
        ],
        [],
        DEFAULT_SETTINGS,
        makeSources({ 'profile-a': PROFILE_A, 'profile-b': PROFILE_B }),
      )

      expect(result.profile.video_stack.length).toBeGreaterThanOrEqual(1)
      // grain should be blended between 0.2 and 0.8
      const grainNode = result.profile.video_stack.find((n) => n.node === 'grain')
      expect(grainNode).toBeDefined()
      const grainAmount = grainNode!.params?.amount as number
      expect(grainAmount).toBeGreaterThan(0.2)
      expect(grainAmount).toBeLessThan(0.8)
    })

    it('includes nodes unique to one preset', async () => {
      const result = await composeEffectiveProfileCore(
        [
          { profileId: 'profile-a', weight: 0.5 },
          { profileId: 'profile-b', weight: 0.5 },
        ],
        [],
        DEFAULT_SETTINGS,
        makeSources({ 'profile-a': PROFILE_A, 'profile-b': PROFILE_B }),
      )

      const nodeNames = result.profile.video_stack.map((n) => n.node)
      expect(nodeNames).toContain('vignette')
    })

    it('blends audio master volume', async () => {
      const result = await composeEffectiveProfileCore(
        [
          { profileId: 'profile-a', weight: 0.5 },
          { profileId: 'profile-b', weight: 0.5 },
        ],
        [],
        DEFAULT_SETTINGS,
        makeSources({ 'profile-a': PROFILE_A, 'profile-b': PROFILE_B }),
      )

      const vol = result.profile.audio_stack?.master?.volume
      expect(vol).toBeDefined()
      // Blended between 0.4 and 0.8
      expect(vol!).toBeGreaterThan(0.4)
      expect(vol!).toBeLessThan(0.8)
    })
  })

  describe('symptom mode (dimensions with mapped motifs)', () => {
    it('adds dimension video motifs to the stack', async () => {
      const dimMapping: DimensionSignalMappingEntry = {
        evidence_strength: 'medium',
        rationale_doc: 'docs/test.md',
        video_motifs: [{ node: 'grain', params_hint: { amount: '0.1 - 0.4' } }],
        audio_motifs: [],
      }

      const sources: ComposeSources = {
        async loadPresetProfile() {
          return null
        },
        getDimensionMappingEntry(dimId: string) {
          return dimId === 'intrusion' ? dimMapping : null
        },
        getExperienceDimensions() {
          return [
            {
              id: 'intrusion',
              label: 'Intrusion',
              description: 'test',
              evidence_strength: 'medium',
              rationale_doc: 'docs/test.md',
            },
          ]
        },
      }

      const result = await composeEffectiveProfileCore(
        [],
        [{ dimensionId: 'intrusion', weight: 0.8 }],
        DEFAULT_SETTINGS,
        sources,
      )

      const grainNode = result.profile.video_stack.find((n) => n.node === 'grain')
      expect(grainNode).toBeDefined()
    })

    it('adds dimension audio motifs to the chain', async () => {
      const dimMapping: DimensionSignalMappingEntry = {
        video_motifs: [],
        audio_motifs: [{ node: 'reverb', params_hint: { decay: '0.5 - 2.0' } }],
      }

      const sources: ComposeSources = {
        async loadPresetProfile() {
          return null
        },
        getDimensionMappingEntry(dimId: string) {
          return dimId === 'derealization' ? dimMapping : null
        },
        getExperienceDimensions() {
          return [{ id: 'derealization', label: 'Derealization', description: 'test' }]
        },
      }

      const result = await composeEffectiveProfileCore(
        [],
        [{ dimensionId: 'derealization', weight: 0.7 }],
        DEFAULT_SETTINGS,
        sources,
      )

      const reverbNode = result.profile.audio_stack?.chain?.find((n) => n.node === 'reverb')
      expect(reverbNode).toBeDefined()
    })

    it('unmapped dimension is handled gracefully with evidence gap', async () => {
      const sources: ComposeSources = {
        async loadPresetProfile() {
          return null
        },
        getDimensionMappingEntry() {
          return null
        },
        getExperienceDimensions() {
          return [{ id: 'unknown_dim', label: 'Unknown', description: 'test' }]
        },
      }

      const result = await composeEffectiveProfileCore(
        [],
        [{ dimensionId: 'unknown_dim', weight: 0.5 }],
        DEFAULT_SETTINGS,
        sources,
      )

      // Should report an evidence gap for the unmapped dimension
      expect(result.report.evidence.gaps.length).toBeGreaterThan(0)
      expect(result.report.evidence.gaps.some((g) => g.dimensionId === 'unknown_dim')).toBe(true)
    })
  })

  describe('missing preset ID', () => {
    it('includes missing preset ID in missingPresets report', async () => {
      const result = await composeEffectiveProfileCore(
        [
          { profileId: 'exists', weight: 0.5 },
          { profileId: 'does_not_exist', weight: 0.5 },
        ],
        [],
        DEFAULT_SETTINGS,
        makeSources({ exists: MINIMAL_PROFILE }),
      )

      expect(result.report.missingPresets).toContain('does_not_exist')
      expect(result.report.missingPresets).not.toContain('exists')
    })
  })

  describe('reactive analyser_to_params deduplication', () => {
    it('deduplicates identical reactive mappings from two presets', async () => {
      const profileWithReactive: Profile = {
        ...MINIMAL_PROFILE,
        reactive: {
          analyser_to_params: [
            { source: 'rms', target: 'video.grain.amount', scale: 1, offset: 0, clamp: [0, 1] },
          ],
        },
      }

      const result = await composeEffectiveProfileCore(
        [
          { profileId: 'a', weight: 0.5 },
          { profileId: 'b', weight: 0.5 },
        ],
        [],
        DEFAULT_SETTINGS,
        makeSources({ a: profileWithReactive, b: profileWithReactive }),
      )

      // The same reactive mapping from both presets should be deduplicated
      const reactive = result.profile.reactive?.analyser_to_params ?? []
      expect(reactive).toHaveLength(1)
    })
  })

  describe('evidence report generation', () => {
    it('includes dimension evidence info and gaps', async () => {
      const dimMapping: DimensionSignalMappingEntry = {
        evidence_strength: 'hypothesis',
        video_motifs: [{ node: 'grain' }],
      }

      const sources: ComposeSources = {
        async loadPresetProfile() {
          return null
        },
        getDimensionMappingEntry(dimId: string) {
          return dimId === 'test_dim' ? dimMapping : null
        },
        getExperienceDimensions() {
          return [{ id: 'test_dim', label: 'Test', description: 'test' }]
        },
      }

      const result = await composeEffectiveProfileCore(
        [],
        [{ dimensionId: 'test_dim', weight: 0.5 }],
        DEFAULT_SETTINGS,
        sources,
      )

      expect(result.report.evidence.dimensions).toHaveLength(1)
      expect(result.report.evidence.dimensions[0].dimensionId).toBe('test_dim')
      // hypothesis evidence strength should produce a warning
      expect(result.report.warnings.some((w) => w.includes('hypothesis'))).toBe(true)
    })

    it('reports missing rationale_doc as evidence gap', async () => {
      const dimMapping: DimensionSignalMappingEntry = {
        evidence_strength: 'medium',
        // No rationale_doc
        video_motifs: [{ node: 'grain' }],
      }

      const sources: ComposeSources = {
        async loadPresetProfile() {
          return null
        },
        getDimensionMappingEntry(dimId: string) {
          return dimId === 'no_doc' ? dimMapping : null
        },
        getExperienceDimensions() {
          return [{ id: 'no_doc', label: 'No Doc', description: 'test' }]
        },
      }

      const result = await composeEffectiveProfileCore(
        [],
        [{ dimensionId: 'no_doc', weight: 0.5 }],
        DEFAULT_SETTINGS,
        sources,
      )

      expect(
        result.report.evidence.gaps.some(
          (g) => g.dimensionId === 'no_doc' && g.reason.includes('rationale_doc'),
        ),
      ).toBe(true)
    })

    it('reports unimplemented video node types as missingNodes', async () => {
      const dimMapping: DimensionSignalMappingEntry = {
        video_motifs: [{ node: 'nonexistent_node_xyz' }],
      }

      const sources: ComposeSources = {
        async loadPresetProfile() {
          return null
        },
        getDimensionMappingEntry(dimId: string) {
          return dimId === 'dim1' ? dimMapping : null
        },
        getExperienceDimensions() {
          return [{ id: 'dim1', label: 'Dim1', description: 'test' }]
        },
      }

      const result = await composeEffectiveProfileCore(
        [],
        [{ dimensionId: 'dim1', weight: 0.5 }],
        DEFAULT_SETTINGS,
        sources,
      )

      expect(result.report.missingNodes.video).toContain('nonexistent_node_xyz')
    })
  })
})
