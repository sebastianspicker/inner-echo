import { describe, expect, it } from 'vitest'

import { composeEffectiveProfileCore } from '../../src/domain/experience/composition/composeCore'
import type { ComposerSettings } from '../../src/domain/experience/composition/types'
import { clampIntensity } from '../../src/domain/experience/safety'
import { profileSchema } from '../../src/domain/experience/schema'
import { buildVideoNodes } from '../../src/runtime/visual/graph/graphBuilder'
import { IMPLEMENTED_VIDEO_NODES } from '../../src/runtime/capabilities'
import { mergeParams } from '../../src/domain/experience/composition/composeBlend'

const profile = profileSchema.parse({
  id: 'direct-test',
  label: 'Direct test',
  summary: 'Small direct contract fixture.',
  framing: { type: 'metaphor' },
  experience_dimensions: [],
  video_stack: [
    { node: 'grain', params: { amount: 0.2 } },
    { node: 'temporal_smear', params: { feedback: 0.9 } },
  ],
  safety: {
    intensity_default: 0.5,
    intensity_max: 0.8,
    warnings: [],
    safe_mode_clamps: { max_intensity: 0.4 },
    reduced_motion_policy: { disable_nodes: ['temporal_smear'] },
  },
})

const compositionSettings: ComposerSettings = {
  intensity: 0.5,
  safeMode: true,
  reducedMotion: false,
  audioEnabled: false,
  micEnabled: false,
  couplingStrength: 0.5,
  maxFeedback: 0.5,
  interactionAmount: 0,
  debugOverlay: false,
}

describe('experience domain contracts', () => {
  it('rejects an unsafe range and applies reduced-motion graph and intensity clamps', () => {
    expect(() =>
      profileSchema.parse({ ...profile, safety: { ...profile.safety, intensity_default: 1 } }),
    ).toThrow(/intensity_default/)

    expect(
      buildVideoNodes(profile, {
        reducedMotion: true,
        supportedNodeIds: IMPLEMENTED_VIDEO_NODES,
      }),
    ).toHaveLength(1)
    expect(clampIntensity(profile, 1, true)).toBe(0.4)
  })

  it('filters prototype-pollution keys during parameter blending', () => {
    const params = mergeParams([
      { w: 1, source: 'profile', params: JSON.parse('{"__proto__":"unsafe","amount":0.2}') },
    ])

    expect(params).toEqual({ amount: 0.2 })
    expect(Object.getPrototypeOf(params)).toBe(Object.prototype)
  })

  it('reports and skips a dimension motif that injected capabilities do not support', async () => {
    const result = await composeEffectiveProfileCore(
      [],
      [{ dimensionId: 'focus', weight: 1 }],
      compositionSettings,
      {
        loadPresetProfile: async () => null,
        getDimensionMappingEntry: () => ({
          rationale_doc: 'focus.md',
          video_motifs: [
            { node: 'grain', params_hint: { amount: '0.2' } },
            { node: 'unsupported_motif', params_hint: { amount: '0.2' } },
          ],
        }),
        getExperienceDimensions: () => [
          { id: 'focus', label: 'Focus', description: 'A focused fixture.' },
        ],
      },
      {
        supportedVideoNodeIds: new Set(['grain']),
        supportedAudioNodeIds: new Set(),
      },
    )

    expect(result.profile.video_stack.map((node) => node.node)).toEqual(['grain'])
    expect(result.report.missingNodes.video).toEqual(['unsupported_motif'])
  })
})
