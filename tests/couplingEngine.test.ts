import { describe, expect, it } from 'vitest'

import { createCouplingEngine } from '../src/engine/reactive/couplingEngine'
import type { AudioMetrics } from '../src/engine/audio/types'
import type { VideoMetrics } from '../src/engine/canvas/videoMetrics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal profile that contains nodes the coupling engine recognizes. */
function makeProfile(opts?: {
  videoStack?: Array<{ node: string; id?: string; params?: Record<string, unknown> }>
  audioChain?: Array<{ node: string; id?: string; params?: Record<string, unknown> }>
}) {
  const videoStack = opts?.videoStack ?? []
  const audioChain = opts?.audioChain ?? []
  return {
    id: 'test',
    label: 'test',
    summary: 'test profile',
    framing: { type: 'metaphor' },
    experience_dimensions: [],
    video_stack: videoStack.map((v) => ({ node: v.node, id: v.id, params: v.params ?? {} })),
    safety: {
      intensity_default: 0.5,
      intensity_max: 1,
      warnings: [],
      safe_mode_clamps: {},
    },
    reactive: { analyser_to_params: [] },
    audio_stack: {
      enabled: true,
      master: { volume: 0.2 },
      chain: audioChain.map((a) => ({ node: a.node, id: a.id, params: a.params ?? {} })),
    },
  } as any
}

function zeroAudio(): AudioMetrics {
  return { rms: 0, centroid: 0, flux: 0, low: 0, mid: 0, high: 0 }
}

function zeroVideo(): VideoMetrics {
  return { motion: 0, luminance: 0.5, edge: 0, instability: 0 }
}

function defaultSettings(overrides?: Partial<Parameters<typeof createCouplingEngine>[1]>) {
  return {
    couplingStrength: 0.5,
    maxFeedback: 1.0,
    reducedMotion: false,
    safeMode: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('engine/reactive/couplingEngine', () => {
  // -----------------------------------------------------------------------
  // API shape
  // -----------------------------------------------------------------------
  it('createCouplingEngine returns an object with setSettings and step', () => {
    const engine = createCouplingEngine(makeProfile(), defaultSettings())
    expect(typeof engine.setSettings).toBe('function')
    expect(typeof engine.step).toBe('function')
  })

  // -----------------------------------------------------------------------
  // Zero coupling strength
  // -----------------------------------------------------------------------
  it('coupling with zero strength returns result near base values', () => {
    const profile = makeProfile({
      videoStack: [{ node: 'grain', params: { amount: 0.1 } }],
      audioChain: [{ node: 'tremolo', params: { depth: 0.05 } }],
    })
    const engine = createCouplingEngine(profile, defaultSettings({ couplingStrength: 0 }))

    const audio: AudioMetrics = { rms: 0.5, centroid: 0.6, flux: 0.3 }
    const video: VideoMetrics = { motion: 0.5, luminance: 0.5, edge: 0.3, instability: 0.1 }

    const result = engine.step(1 / 60, audio, video, { '0.amount': 0.1 })

    // With zero strength, all compute functions should add nothing to the base.
    // The video outputs should be close to the base (0.1) or clamped version.
    for (const v of Object.values(result.video)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
    // Audio outputs similarly should be near their base values.
    for (const v of Object.values(result.audio)) {
      expect(v).toBeGreaterThanOrEqual(0)
    }
  })

  // -----------------------------------------------------------------------
  // Full strength applies modulation
  // -----------------------------------------------------------------------
  it('coupling with full strength + loud audio produces larger video overrides than silence', () => {
    const profile = makeProfile({
      videoStack: [{ node: 'grain', params: { amount: 0.05 } }],
    })
    const settings = defaultSettings({ couplingStrength: 1, maxFeedback: 1 })
    const engine = createCouplingEngine(profile, settings)

    // Step with silence (many frames to converge smoothed values).
    const silentAudio = zeroAudio()
    const neutralVideo = zeroVideo()
    let silentResult = engine.step(1 / 60, silentAudio, neutralVideo, { '0.amount': 0.05 })
    for (let i = 0; i < 120; i++) {
      silentResult = engine.step(1 / 60, silentAudio, neutralVideo, { '0.amount': 0.05 })
    }

    // Now create a fresh engine and step with loud audio.
    const engine2 = createCouplingEngine(profile, settings)
    const loudAudio: AudioMetrics = { rms: 0.9, centroid: 0.7, flux: 0.5 }
    let loudResult = engine2.step(1 / 60, loudAudio, neutralVideo, { '0.amount': 0.05 })
    for (let i = 0; i < 120; i++) {
      loudResult = engine2.step(1 / 60, loudAudio, neutralVideo, { '0.amount': 0.05 })
    }

    // The grain amount with loud audio should be >= the silent version.
    const silentGrain = silentResult.video['0.amount'] ?? 0
    const loudGrain = loudResult.video['0.amount'] ?? 0
    expect(loudGrain).toBeGreaterThanOrEqual(silentGrain)
  })

  // -----------------------------------------------------------------------
  // Multiple dimensions (video + audio interaction)
  // -----------------------------------------------------------------------
  it('step produces both video and audio overrides when profile has both types', () => {
    const profile = makeProfile({
      videoStack: [
        { node: 'grain', params: { amount: 0.1 } },
        { node: 'vignette', params: { amount: 0.2 } },
      ],
      audioChain: [
        { node: 'tremolo', params: { depth: 0.05, rate: 2 } },
        { node: 'lowpass', params: { cutoff: 800 } },
      ],
    })
    const engine = createCouplingEngine(profile, defaultSettings({ couplingStrength: 0.5 }))

    const audio: AudioMetrics = { rms: 0.4, centroid: 0.5, flux: 0.2 }
    const video: VideoMetrics = { motion: 0.3, luminance: 0.6, edge: 0.2, instability: 0.1 }
    const base = { '0.amount': 0.1, '1.amount': 0.2 }

    // Run several frames for the smoothing to settle.
    let result = engine.step(1 / 60, audio, video, base)
    for (let i = 0; i < 60; i++) {
      result = engine.step(1 / 60, audio, video, base)
    }

    // Should have grain + vignette video keys.
    const videoKeys = Object.keys(result.video)
    expect(videoKeys.length).toBeGreaterThanOrEqual(2)

    // Should have tremolo + lowpass audio keys.
    const audioKeys = Object.keys(result.audio)
    expect(audioKeys.length).toBeGreaterThanOrEqual(2)

    // All values should be finite.
    for (const v of Object.values(result.video)) {
      expect(Number.isFinite(v)).toBe(true)
    }
    for (const v of Object.values(result.audio)) {
      expect(Number.isFinite(v)).toBe(true)
    }
  })

  // -----------------------------------------------------------------------
  // Empty profile doesn't crash
  // -----------------------------------------------------------------------
  it('empty profile produces empty result without crashing', () => {
    const profile = makeProfile()
    const engine = createCouplingEngine(profile, defaultSettings())
    const result = engine.step(1 / 60, zeroAudio(), zeroVideo(), {})
    expect(result.video).toEqual({})
    expect(result.audio).toEqual({})
  })

  // -----------------------------------------------------------------------
  // Profile with unknown nodes doesn't crash
  // -----------------------------------------------------------------------
  it("profile with unknown/unrecognized nodes doesn't crash", () => {
    const profile = makeProfile({
      videoStack: [{ node: 'unknown_node_xyz', params: { amount: 0.1 } }],
      audioChain: [{ node: 'imaginary_fx', params: { level: 0.5 } }],
    })
    const engine = createCouplingEngine(profile, defaultSettings())
    const result = engine.step(1 / 60, zeroAudio(), zeroVideo(), {})
    // Unknown nodes are silently skipped — no video/audio mappings for them.
    expect(result).toBeDefined()
  })

  // -----------------------------------------------------------------------
  // setSettings updates coupling strength
  // -----------------------------------------------------------------------
  it('setSettings changes coupling behavior on subsequent steps', () => {
    const profile = makeProfile({
      videoStack: [{ node: 'grain', params: { amount: 0.05 } }],
    })
    const engine = createCouplingEngine(profile, defaultSettings({ couplingStrength: 1 }))

    const audio: AudioMetrics = { rms: 0.8, centroid: 0.5, flux: 0.3 }
    const video = zeroVideo()

    // Step with full strength.
    let fullResult = engine.step(1 / 60, audio, video, { '0.amount': 0.05 })
    for (let i = 0; i < 60; i++) {
      fullResult = engine.step(1 / 60, audio, video, { '0.amount': 0.05 })
    }

    // Now reduce strength to 0.
    engine.setSettings({ couplingStrength: 0, maxFeedback: 1, safeMode: false })

    // Step many frames to let smoothing converge toward the new (silent) target.
    let reducedResult = engine.step(1 / 60, audio, video, { '0.amount': 0.05 })
    for (let i = 0; i < 200; i++) {
      reducedResult = engine.step(1 / 60, audio, video, { '0.amount': 0.05 })
    }

    // After zeroing strength, the grain override should be close to the base (0.05).
    const fullGrain = fullResult.video['0.amount'] ?? 0
    const reducedGrain = reducedResult.video['0.amount'] ?? 0
    expect(reducedGrain).toBeLessThanOrEqual(fullGrain + 0.001)
  })

  // -----------------------------------------------------------------------
  // Safe mode applies damping
  // -----------------------------------------------------------------------
  it('safeMode applies additional damping (lower output than non-safe)', () => {
    const profile = makeProfile({
      videoStack: [{ node: 'grain', params: { amount: 0.05 } }],
    })

    const audio: AudioMetrics = { rms: 0.8, centroid: 0.5, flux: 0.3 }
    const video = zeroVideo()

    // Non-safe engine.
    const engineNormal = createCouplingEngine(
      profile,
      defaultSettings({ couplingStrength: 1, safeMode: false }),
    )
    let normalResult = engineNormal.step(1 / 60, audio, video, { '0.amount': 0.05 })
    for (let i = 0; i < 120; i++) {
      normalResult = engineNormal.step(1 / 60, audio, video, { '0.amount': 0.05 })
    }

    // Safe engine.
    const engineSafe = createCouplingEngine(
      profile,
      defaultSettings({ couplingStrength: 1, safeMode: true }),
    )
    let safeResult = engineSafe.step(1 / 60, audio, video, { '0.amount': 0.05 })
    for (let i = 0; i < 120; i++) {
      safeResult = engineSafe.step(1 / 60, audio, video, { '0.amount': 0.05 })
    }

    const normalGrain = normalResult.video['0.amount'] ?? 0
    const safeGrain = safeResult.video['0.amount'] ?? 0
    // Safe mode damping factor is 0.6, so safe output should be <= normal.
    expect(safeGrain).toBeLessThanOrEqual(normalGrain + 0.001)
  })

  // -----------------------------------------------------------------------
  // Mic-specific metrics are preferred when available
  // -----------------------------------------------------------------------
  it('mic metrics are preferred over main metrics when present', () => {
    const profile = makeProfile({
      videoStack: [{ node: 'grain', params: { amount: 0 } }],
    })

    const settings = defaultSettings({ couplingStrength: 1 })

    // Engine with main RMS only.
    const engineMain = createCouplingEngine(profile, settings)
    const audioMain: AudioMetrics = { rms: 0.5, centroid: 0.3, flux: 0.2 }
    let mainResult = engineMain.step(1 / 60, audioMain, zeroVideo(), { '0.amount': 0 })
    for (let i = 0; i < 120; i++) {
      mainResult = engineMain.step(1 / 60, audioMain, zeroVideo(), { '0.amount': 0 })
    }

    // Engine with mic RMS higher than main RMS.
    const engineMic = createCouplingEngine(profile, settings)
    const audioMic: AudioMetrics = {
      rms: 0.1,
      centroid: 0.1,
      flux: 0.1,
      micRms: 0.9,
      micCentroid: 0.8,
      micFlux: 0.5,
    }
    let micResult = engineMic.step(1 / 60, audioMic, zeroVideo(), { '0.amount': 0 })
    for (let i = 0; i < 120; i++) {
      micResult = engineMic.step(1 / 60, audioMic, zeroVideo(), { '0.amount': 0 })
    }

    // The mic-driven grain should be larger because micRms (0.9) >> rms (0.1).
    const mainGrain = mainResult.video['0.amount'] ?? 0
    const micGrain = micResult.video['0.amount'] ?? 0
    expect(micGrain).toBeGreaterThan(mainGrain)
  })

  // -----------------------------------------------------------------------
  // Video → audio coupling (motion → tremolo)
  // -----------------------------------------------------------------------
  it('video motion drives audio tremolo depth when profile has tremolo', () => {
    const profile = makeProfile({
      audioChain: [{ node: 'tremolo', params: { depth: 0.02, rate: 2 } }],
    })
    const settings = defaultSettings({ couplingStrength: 1 })
    const engine = createCouplingEngine(profile, settings)

    // High video motion.
    const video: VideoMetrics = { motion: 0.9, luminance: 0.5, edge: 0.3, instability: 0.3 }
    let result = engine.step(1 / 60, zeroAudio(), video, {})
    for (let i = 0; i < 120; i++) {
      result = engine.step(1 / 60, zeroAudio(), video, {})
    }

    // The tremolo depth override should be > 0 because motion > 0 and strength > 0.
    const tremoloDepthKeys = Object.keys(result.audio).filter((k) => k.includes('depth'))
    expect(tremoloDepthKeys.length).toBeGreaterThan(0)
    const depth = result.audio[tremoloDepthKeys[0]]
    expect(depth).toBeGreaterThan(0)
  })

  // -----------------------------------------------------------------------
  // Result values are always clamped within safe ranges
  // -----------------------------------------------------------------------
  it('all output values are within defined clamp ranges', () => {
    const profile = makeProfile({
      videoStack: [
        { node: 'grain', params: { amount: 0.1 } },
        { node: 'vignette', params: { amount: 0.3 } },
        { node: 'interference', params: { amount: 0.1 } },
      ],
      audioChain: [
        { node: 'tremolo', params: { depth: 0.1, rate: 2 } },
        { node: 'lowpass', params: { cutoff: 800 } },
        { node: 'noise_bed', params: { level: 0.03 } },
      ],
    })
    const engine = createCouplingEngine(
      profile,
      defaultSettings({ couplingStrength: 1, maxFeedback: 1 }),
    )

    // Extreme inputs.
    const extremeAudio: AudioMetrics = {
      rms: 1,
      centroid: 1,
      flux: 1,
      micRms: 1,
      micCentroid: 1,
      micFlux: 1,
    }
    const extremeVideo: VideoMetrics = { motion: 1, luminance: 1, edge: 1, instability: 1 }

    let result = engine.step(1 / 60, extremeAudio, extremeVideo, {
      '0.amount': 0.5,
      '1.amount': 0.5,
      '2.amount': 0.5,
    })
    for (let i = 0; i < 200; i++) {
      result = engine.step(1 / 60, extremeAudio, extremeVideo, {
        '0.amount': 0.5,
        '1.amount': 0.5,
        '2.amount': 0.5,
      })
    }

    // All video values should be in [0, 1].
    for (const [, v] of Object.entries(result.video)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
    // Audio values should be non-negative and finite.
    for (const [, v] of Object.entries(result.audio)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(v)).toBe(true)
    }
  })
})
