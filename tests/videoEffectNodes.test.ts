import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import {
  GrainNode,
  VignetteNode,
  ChromaticAberrationNode,
  TemporalSmearNode,
  ColorGradeNode,
  HazeNode,
  SoftBlurNode,
  EdgeSharpenNode,
  PulseNode,
  InterferenceNode,
  FocusJitterNode,
  FeedbackLoopNode,
  GridHintNode,
} from '../src/engine/effects'
import type { VideoNode, VideoNodeParams } from '../src/engine/effects/VideoNode'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dummyTexture(): THREE.Texture {
  return new THREE.Texture()
}

function defaultParams(overrides?: Partial<VideoNodeParams>): VideoNodeParams {
  return {
    intensity: 0.5,
    safeMode: false,
    controlValues: {},
    nodeIndex: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Node registry: each entry describes one video effect node class.
// ---------------------------------------------------------------------------
interface NodeEntry {
  name: string
  create: () => VideoNode
  isTemporal: boolean
  hasTick: boolean
}

const nodeEntries: NodeEntry[] = [
  { name: 'GrainNode', create: () => new GrainNode(), isTemporal: false, hasTick: true },
  { name: 'VignetteNode', create: () => new VignetteNode(), isTemporal: false, hasTick: false },
  {
    name: 'ChromaticAberrationNode',
    create: () => new ChromaticAberrationNode(),
    isTemporal: false,
    hasTick: false,
  },
  {
    name: 'TemporalSmearNode',
    create: () => new TemporalSmearNode(),
    isTemporal: true,
    hasTick: true,
  },
  { name: 'ColorGradeNode', create: () => new ColorGradeNode(), isTemporal: false, hasTick: false },
  { name: 'HazeNode', create: () => new HazeNode(), isTemporal: false, hasTick: false },
  { name: 'SoftBlurNode', create: () => new SoftBlurNode(), isTemporal: false, hasTick: false },
  {
    name: 'EdgeSharpenNode',
    create: () => new EdgeSharpenNode(),
    isTemporal: false,
    hasTick: false,
  },
  { name: 'PulseNode', create: () => new PulseNode(), isTemporal: false, hasTick: true },
  {
    name: 'InterferenceNode',
    create: () => new InterferenceNode(),
    isTemporal: false,
    hasTick: true,
  },
  {
    name: 'FocusJitterNode',
    create: () => new FocusJitterNode(),
    isTemporal: false,
    hasTick: true,
  },
  {
    name: 'FeedbackLoopNode',
    create: () => new FeedbackLoopNode(),
    isTemporal: true,
    hasTick: true,
  },
  { name: 'GridHintNode', create: () => new GridHintNode(), isTemporal: false, hasTick: false },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('engine/effects (VideoNode implementations)', () => {
  for (const entry of nodeEntries) {
    describe(entry.name, () => {
      it('can be instantiated', () => {
        const node = entry.create()
        expect(node).toBeTruthy()
      })

      it('getMaterial() returns a THREE.ShaderMaterial', () => {
        const node = entry.create()
        const tex = dummyTexture()
        const prevTex = entry.isTemporal ? dummyTexture() : undefined
        const mat = node.getMaterial(tex, prevTex)
        expect(mat).toBeInstanceOf(THREE.ShaderMaterial)
      })

      it('getMaterial() returns the same material on second call', () => {
        const node = entry.create()
        const tex = dummyTexture()
        const prevTex = entry.isTemporal ? dummyTexture() : undefined
        const mat1 = node.getMaterial(tex, prevTex)
        const mat2 = node.getMaterial(tex, prevTex)
        expect(mat1).toBe(mat2)
      })

      it('setParams() with typical params does not throw (before getMaterial)', () => {
        const node = entry.create()
        // setParams before getMaterial should be a no-op (material is null) and not crash.
        expect(() => node.setParams(defaultParams())).not.toThrow()
      })

      it('setParams() with typical params does not throw (after getMaterial)', () => {
        const node = entry.create()
        const tex = dummyTexture()
        const prevTex = entry.isTemporal ? dummyTexture() : undefined
        node.getMaterial(tex, prevTex)
        expect(() =>
          node.setParams(
            defaultParams({
              intensity: 0.7,
              controlValues: {
                '0.amount': 0.3,
                '0.feedback': 0.1,
                '0.depth': 0.1,
                '0.decay': 0.95,
              },
            }),
          ),
        ).not.toThrow()
      })

      it('setParams() with safeMode=true does not throw', () => {
        const node = entry.create()
        node.getMaterial(dummyTexture(), entry.isTemporal ? dummyTexture() : undefined)
        expect(() =>
          node.setParams(
            defaultParams({
              intensity: 0.8,
              safeMode: true,
              safetyContext: {
                global: {
                  max_feedback: 0.18,
                  max_jitter: 0.06,
                  max_chroma: 0.12,
                  max_pulse_depth: 0.18,
                  max_flash_hz: 3,
                  max_luminance_delta_per_frame: 0.25,
                  max_global_contrast: 0.25,
                },
                safeMode: {
                  max_intensity: 0.7,
                  max_temporal_feedback: 0.1,
                  max_jitter: 0.04,
                  max_chroma: 0.08,
                  max_pulse_depth: 0.12,
                  max_flash_hz: 2,
                  max_contrast: 0.15,
                },
              },
              controlValues: { '0.amount': 0.5, '0.feedback': 0.2, '0.depth': 0.2 },
            }),
          ),
        ).not.toThrow()
      })

      it('setParams() with zero intensity does not throw', () => {
        const node = entry.create()
        node.getMaterial(dummyTexture(), entry.isTemporal ? dummyTexture() : undefined)
        expect(() => node.setParams(defaultParams({ intensity: 0 }))).not.toThrow()
      })

      it('setParams() with uvScale and uvOffset does not throw', () => {
        const node = entry.create()
        node.getMaterial(dummyTexture(), entry.isTemporal ? dummyTexture() : undefined)
        expect(() =>
          node.setParams(defaultParams({ uvScale: [1.2, 0.9], uvOffset: [0.05, -0.05] })),
        ).not.toThrow()
      })

      it('dispose() cleans up material', () => {
        const node = entry.create()
        const tex = dummyTexture()
        const mat = node.getMaterial(tex, entry.isTemporal ? dummyTexture() : undefined)
        expect(mat).toBeTruthy()
        expect(() => node.dispose()).not.toThrow()

        // After dispose, getMaterial should create a new material.
        const mat2 = node.getMaterial(tex, entry.isTemporal ? dummyTexture() : undefined)
        expect(mat2).not.toBe(mat)
      })

      it('dispose() can be called before getMaterial without error', () => {
        const node = entry.create()
        expect(() => node.dispose()).not.toThrow()
      })

      it('dispose() is idempotent', () => {
        const node = entry.create()
        node.getMaterial(dummyTexture(), entry.isTemporal ? dummyTexture() : undefined)
        expect(() => {
          node.dispose()
          node.dispose()
        }).not.toThrow()
      })

      if (entry.hasTick) {
        it('tick() advances without error', () => {
          const node = entry.create() as VideoNode & { tick: (d: number) => void }
          node.getMaterial(dummyTexture(), entry.isTemporal ? dummyTexture() : undefined)
          expect(() => node.tick(1 / 60)).not.toThrow()
          expect(() => node.tick(1 / 60)).not.toThrow()
        })
      }
    })
  }

  // -----------------------------------------------------------------------
  // Temporal node flag
  // -----------------------------------------------------------------------
  describe('needsPreviousFrame flag', () => {
    it('TemporalSmearNode.needsPreviousFrame is true', () => {
      const node = new TemporalSmearNode()
      expect(node.needsPreviousFrame).toBe(true)
    })

    it('FeedbackLoopNode.needsPreviousFrame is true', () => {
      const node = new FeedbackLoopNode()
      expect(node.needsPreviousFrame).toBe(true)
    })

    it('non-temporal nodes do not have needsPreviousFrame=true', () => {
      const nonTemporalNodes = nodeEntries.filter((e) => !e.isTemporal)
      for (const entry of nonTemporalNodes) {
        const node = entry.create()
        expect(node.needsPreviousFrame ?? false).toBe(false)
      }
    })
  })

  // -----------------------------------------------------------------------
  // nodeName property
  // -----------------------------------------------------------------------
  describe('nodeName property', () => {
    const expectedNames: Record<string, string> = {
      GrainNode: 'grain',
      VignetteNode: 'vignette',
      ChromaticAberrationNode: 'chromatic_aberration',
      TemporalSmearNode: 'temporal_smear',
      ColorGradeNode: 'color_grade',
      HazeNode: 'haze',
      SoftBlurNode: 'soft_blur',
      EdgeSharpenNode: 'edge_sharpen',
      PulseNode: 'pulse',
      InterferenceNode: 'interference',
      FocusJitterNode: 'focus_jitter',
      FeedbackLoopNode: 'feedback_loop',
      GridHintNode: 'grid_hint',
    }

    for (const entry of nodeEntries) {
      it(`${entry.name} has nodeName="${expectedNames[entry.name]}"`, () => {
        const node = entry.create()
        expect(node.nodeName).toBe(expectedNames[entry.name])
      })
    }
  })

  // -----------------------------------------------------------------------
  // Temporal nodes accept previousFrameTexture
  // -----------------------------------------------------------------------
  describe('temporal node getMaterial with previousFrameTexture', () => {
    it('TemporalSmearNode uses previousFrameTexture', () => {
      const node = new TemporalSmearNode()
      const input = dummyTexture()
      const prev = dummyTexture()
      const mat = node.getMaterial(input, prev) as THREE.ShaderMaterial
      expect(mat.uniforms.u_prev.value).toBe(prev)
      node.dispose()
    })

    it('FeedbackLoopNode uses previousFrameTexture', () => {
      const node = new FeedbackLoopNode()
      const input = dummyTexture()
      const prev = dummyTexture()
      const mat = node.getMaterial(input, prev) as THREE.ShaderMaterial
      expect(mat.uniforms.u_prev.value).toBe(prev)
      node.dispose()
    })

    it('TemporalSmearNode falls back to input when no prev texture', () => {
      const node = new TemporalSmearNode()
      const input = dummyTexture()
      const mat = node.getMaterial(input, null) as THREE.ShaderMaterial
      expect(mat.uniforms.u_prev.value).toBe(input)
      node.dispose()
    })
  })

  // -----------------------------------------------------------------------
  // ColorGradeNode specifics
  // -----------------------------------------------------------------------
  describe('ColorGradeNode specifics', () => {
    it('setParams with contrast, saturation, brightness does not throw', () => {
      const node = new ColorGradeNode()
      node.getMaterial(dummyTexture())
      expect(() =>
        node.setParams(
          defaultParams({
            controlValues: { '0.contrast': 0.1, '0.saturation': -0.2, '0.brightness': 0.05 },
          }),
        ),
      ).not.toThrow()
      node.dispose()
    })
  })

  // -----------------------------------------------------------------------
  // InterferenceNode burst scheduling
  // -----------------------------------------------------------------------
  describe('InterferenceNode burst scheduling', () => {
    it('multiple tick() calls with burst_probability=0 keep burst at 0', () => {
      const node = new InterferenceNode()
      const mat = node.getMaterial(dummyTexture()) as THREE.ShaderMaterial
      node.setParams(
        defaultParams({
          controlValues: { '0.amount': 0.1, '0.burst_probability': 0 },
        }),
      )
      for (let i = 0; i < 60; i++) {
        node.tick(1 / 60)
      }
      expect(mat.uniforms.u_burst.value).toBe(0)
      node.dispose()
    })
  })
})
