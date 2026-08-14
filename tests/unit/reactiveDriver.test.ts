import { describe, expect, it } from 'vitest'

import { createReactiveDriver } from '../../src/engine/reactive/reactiveDriver'
import type { Profile, ReactiveConfig } from '../../src/conditions/schema'

type AnalyserMapping = NonNullable<ReactiveConfig['analyser_to_params']>[number]

function makeRmsMapping(overrides: Partial<AnalyserMapping> = {}): AnalyserMapping {
  return {
    source: 'rms',
    target: 'video.grain.amount',
    scale: 1,
    offset: 0,
    clamp: [0, 1],
    smoothing: { attack: 0, release: 0 },
    ...overrides,
  }
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 't',
    label: 't',
    summary: 't',
    framing: { type: 'metaphor' },
    experience_dimensions: [],
    video_stack: [{ node: 'grain', params: { amount: 0 } }],
    safety: {
      intensity_default: 0.5,
      intensity_max: 1,
      warnings: [],
      safe_mode_clamps: {},
    },
    reactive: {
      analyser_to_params: [
        {
          source: 'rms',
          target: 'video.grain.amount',
          scale: 1,
          offset: 0,
          clamp: [0, 1],
          smoothing: { attack: 0, release: 0 },
        },
      ],
    },
    ...overrides,
  } as Profile
}

function getGrainOverride(mapping: Partial<AnalyserMapping>, rms: number): number | undefined {
  const profile = makeProfile({
    video_stack: [{ node: 'grain', params: { amount: 0.2 } }],
    reactive: { analyser_to_params: [makeRmsMapping(mapping)] },
  })
  return createReactiveDriver(profile).getVideoOverrides(1 / 60, rms)['0.amount']
}

describe('engine/reactive/reactiveDriver', () => {
  it('normalizes reversed clamp ranges instead of pinning output', () => {
    const profile = makeProfile({
      reactive: {
        analyser_to_params: [makeRmsMapping({ clamp: [1, 0] })],
      },
    })

    const driver = createReactiveDriver(profile)
    const low = driver.getVideoOverrides(1 / 60, 0.1)['0.amount']
    const high = driver.getVideoOverrides(1 / 60, 0.9)['0.amount']
    expect(low).toBeGreaterThanOrEqual(0)
    expect(high).toBeLessThanOrEqual(1)
    expect(high).toBeGreaterThan(low)
  })

  it('uses the default unit clamp when a mapping omits its clamp range', () => {
    expect(getGrainOverride({ clamp: undefined }, 0.5)).toBeCloseTo(0.7)
  })

  it('returns empty overrides when profile has no reactive mappings', () => {
    const profile = makeProfile({ reactive: { analyser_to_params: [] } })
    const driver = createReactiveDriver(profile)
    expect(driver.getVideoOverrides(1 / 60, 0.5)).toEqual({})
    expect(driver.getAudioOverrides(1 / 60, 0.5)).toEqual({})
  })

  it('returns empty overrides when profile has no reactive block', () => {
    const profile = makeProfile({ reactive: undefined })
    const driver = createReactiveDriver(profile)
    expect(driver.getVideoOverrides(1 / 60, 0.5)).toEqual({})
  })

  it('keeps video profile defaults when RMS-driven modulation is silent', () => {
    expect(getGrainOverride({ scale: 0.15, clamp: [0, 0.45] }, 0)).toBeCloseTo(0.2)
  })

  it('adds video RMS modulation on top of the profile default', () => {
    expect(getGrainOverride({ scale: 0.1, offset: 0.05, clamp: [0, 0.45] }, 0.5)).toBeCloseTo(0.3)
  })

  describe('audio override paths', () => {
    it('produces audio overrides for audio-targeted mappings', () => {
      const profile = makeProfile({
        audio_stack: {
          enabled: true,
          chain: [{ id: 'tremolo', node: 'tremolo', params: { depth: 0.1 } }],
        },
        reactive: {
          analyser_to_params: [makeRmsMapping({ target: 'audio.tremolo.depth' })],
        },
      })

      const driver = createReactiveDriver(profile)
      // Need to call getVideoOverrides first (it runs stepAll)
      driver.getVideoOverrides(1 / 60, 0.5)
      const audioOverrides = driver.getAudioOverrides(1 / 60, 0.5)
      // The audio param key should be audio.<chainIndex>.<param>
      const keys = Object.keys(audioOverrides)
      expect(keys.length).toBeGreaterThan(0)
      expect(keys[0]).toContain('audio.')
    })

    it('keeps audio reactive mappings absolute for explicit sweeps', () => {
      const profile = makeProfile({
        audio_stack: {
          enabled: true,
          chain: [{ id: 'lowpass', node: 'lowpass', params: { cutoff: 5200 } }],
        },
        reactive: {
          analyser_to_params: [
            makeRmsMapping({
              target: 'audio.lowpass.cutoff',
              scale: -2500,
              offset: 7000,
              clamp: [4500, 7000],
            }),
          ],
        },
      })

      const driver = createReactiveDriver(profile)
      driver.getVideoOverrides(1 / 60, 0)

      expect(driver.getAudioOverrides(1 / 60, 0)['audio.0.cutoff']).toBeCloseTo(7000)
    })

    it('missing audio chain index is skipped gracefully', () => {
      const profile = makeProfile({
        audio_stack: { enabled: true, chain: [] }, // empty chain
        reactive: {
          analyser_to_params: [makeRmsMapping({ target: 'audio.nonexistent.depth' })],
        },
      })

      const driver = createReactiveDriver(profile)
      const videoOverrides = driver.getVideoOverrides(1 / 60, 0.5)
      const audioOverrides = driver.getAudioOverrides(1 / 60, 0.5)
      // Should just be empty since the target can't be resolved
      expect(Object.keys(videoOverrides)).toHaveLength(0)
      expect(Object.keys(audioOverrides)).toHaveLength(0)
    })
  })

  describe('smoothing behavior', () => {
    it('rapid RMS changes produce smooth transitions with nonzero smoothing', () => {
      const profile = makeProfile({
        reactive: {
          analyser_to_params: [makeRmsMapping({ smoothing: { attack: 0.1, release: 0.2 } })],
        },
      })

      const driver = createReactiveDriver(profile)
      const dt = 1 / 60

      // Silence phase
      driver.getVideoOverrides(dt, 0)
      driver.getVideoOverrides(dt, 0)
      const silenceVal = driver.getVideoOverrides(dt, 0)['0.amount']

      // Sudden loud
      const loudVal1 = driver.getVideoOverrides(dt, 0.9)['0.amount']
      const loudVal2 = driver.getVideoOverrides(dt, 0.9)['0.amount']

      // With smoothing, the value should not instantly jump to 0.9
      expect(loudVal1).toBeLessThan(0.9)
      // Second frame should be closer to target
      expect(loudVal2).toBeGreaterThan(loudVal1)

      // Sudden silence again
      const dropVal = driver.getVideoOverrides(dt, 0)['0.amount']
      // Should not instantly drop to 0 due to release smoothing
      expect(dropVal).toBeGreaterThan(0)
    })

    it('zero smoothing produces instant response', () => {
      const profile = makeProfile({
        reactive: { analyser_to_params: [makeRmsMapping()] },
      })

      const driver = createReactiveDriver(profile)
      const dt = 1 / 60

      const val = driver.getVideoOverrides(dt, 0.7)['0.amount']
      expect(val).toBeCloseTo(0.7)
    })
  })

  describe('scale and offset', () => {
    it('applies scale and offset to RMS input', () => {
      const profile = makeProfile({
        reactive: {
          analyser_to_params: [makeRmsMapping({ scale: 2, offset: 0.1 })],
        },
      })

      const driver = createReactiveDriver(profile)
      // raw = rms * scale + offset = 0.3 * 2 + 0.1 = 0.7
      const val = driver.getVideoOverrides(1 / 60, 0.3)['0.amount']
      expect(val).toBeCloseTo(0.7)
    })

    it('clamps result to clamp range', () => {
      const profile = makeProfile({
        reactive: {
          analyser_to_params: [makeRmsMapping({ scale: 5, clamp: [0, 0.5] })],
        },
      })

      const driver = createReactiveDriver(profile)
      // raw = 0.9 * 5 = 4.5, clamped to 0.5
      const val = driver.getVideoOverrides(1 / 60, 0.9)['0.amount']
      expect(val).toBeCloseTo(0.5)
    })
  })

  describe('getAudioOverrides syncs with getVideoOverrides', () => {
    it('calling getAudioOverrides with different params triggers re-step', () => {
      const profile = makeProfile({
        audio_stack: {
          enabled: true,
          chain: [{ id: 'tremolo', node: 'tremolo', params: { depth: 0 } }],
        },
        reactive: {
          analyser_to_params: [makeRmsMapping(), makeRmsMapping({ target: 'audio.tremolo.depth' })],
        },
      })

      const driver = createReactiveDriver(profile)
      // First call sets lastDelta/lastRms
      driver.getVideoOverrides(1 / 60, 0.3)
      // Call audio with same params - should reuse cached step
      const audio1 = driver.getAudioOverrides(1 / 60, 0.3)
      // Call audio with different rms - should re-step
      const audio2 = driver.getAudioOverrides(1 / 60, 0.8)
      expect(Object.keys(audio1).length).toBeGreaterThan(0)
      // audio2 with higher rms should produce different (higher) values
      const key = Object.keys(audio2)[0]
      expect(audio2[key]).toBeGreaterThan(audio1[key])
    })
  })

  describe('non-rms sources are skipped', () => {
    it('skips non-rms source mappings', () => {
      const profile = makeProfile({
        reactive: {
          analyser_to_params: [
            {
              source: 'spectral_centroid',
              target: 'video.grain.amount',
              scale: 1,
              offset: 0,
              clamp: [0, 1],
              smoothing: { attack: 0, release: 0 },
            },
          ],
        },
      })

      const driver = createReactiveDriver(profile)
      const overrides = driver.getVideoOverrides(1 / 60, 0.5)
      expect(Object.keys(overrides)).toHaveLength(0)
    })
  })
})
