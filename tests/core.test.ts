// These tests intentionally cover only pure, safety-critical boundaries.
// UI and browser automation belong to manual product validation.
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { buildVideoNodes } from '../src/conditions/graphBuilder'
import { clampIntensity } from '../src/conditions/normalize'
import { profileSchema } from '../src/conditions/schema'
import { mergeParams } from '../src/composer/composeBlend'
import { createOverlayRuntime } from '../src/engine/canvas/overlayRuntime'
import { renderEvidenceMarkdown } from '../src/evidence/markdown'

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

describe('core safety contracts', () => {
  it('rejects an unsafe schema range and applies graph safety controls', () => {
    expect(() =>
      profileSchema.parse({ ...profile, safety: { ...profile.safety, intensity_default: 1 } }),
    ).toThrow(/intensity_default/)
    expect(buildVideoNodes(profile, { reducedMotion: true })).toHaveLength(1)
    expect(clampIntensity(profile, 1, true)).toBe(0.4)
  })

  it('filters prototype-pollution keys while blending graph parameters', () => {
    expect(
      mergeParams([
        { w: 1, source: 'profile', params: JSON.parse('{"__proto__":"unsafe","amount":0.2}') },
      ]),
    ).toEqual({ amount: 0.2 })
  })

  it('sanitizes rendered evidence HTML', () => {
    const { fragment, title } = renderEvidenceMarkdown('# Evidence\n<script>alert(1)</script>')
    const container = document.createElement('div')
    container.append(fragment)
    expect(title).toBe('Evidence')
    expect(container.innerHTML).not.toContain('<script')
  })

  it('reports unavailable overlay state without activating rendering', () => {
    const states: string[] = []
    const runtime = createOverlayRuntime(
      { video: null, webglCanvas: null, fallbackCanvas: null, container: null },
      { onStateChange: (state) => states.push(state.rendererMode) },
    )
    runtime.reportUnavailable()
    expect(states).toEqual(['unavailable'])
    expect(runtime.control.getDiagnostics?.().rendererMode).toBe('unavailable')
  })
})
