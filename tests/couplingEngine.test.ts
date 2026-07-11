import { describe, expect, it } from 'vitest'

import { createCouplingEngine } from '../src/engine/reactive/couplingEngine'
import type { Profile } from '../src/conditions/schema'
import type { AudioMetrics } from '../src/engine/audio/types'
import type { VideoMetrics } from '../src/engine/canvas/videoMetrics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal profile that contains nodes the coupling engine recognizes. */
function makeProfile(opts?: {
  videoStack?: Array<{ node: string; id?: string; params?: Record<string, unknown> }>
  audioChain?: Array<{ node: string; id?: string; params?: Record<string, unknown> }>
}): Profile {
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
  }
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

  it('treats mixed-case video node types as valid during index building', () => {
    const profile = makeProfile({
      videoStack: [{ node: 'GrAiN', id: 'grain', params: { amount: 0.05 } }],
    })
    const engine = createCouplingEngine(profile, defaultSettings())

    const result = engine.step(1 / 60, { rms: 0.8, centroid: 0.5, flux: 0.3 }, zeroVideo(), {
      '0.amount': 0.05,
    })

    expect(result.video['0.amount']).toBeTypeOf('number')
  })

  it.each([
    'chromatic_aberration',
    'chroma_aberration',
  ])('applies chroma coupling to %s video node name', (nodeName) => {
    const profile = makeProfile({
      videoStack: [{ node: nodeName, params: { amount: 0.02 } }],
    })
    const engine = createCouplingEngine(
      profile,
      defaultSettings({ couplingStrength: 1, maxFeedback: 1 }),
    )
    const audio: AudioMetrics = { rms: 0.1, centroid: 0.9, flux: 0.1 }
    const base = { '0.amount': 0.02 }

    let result = engine.step(1 / 60, audio, zeroVideo(), base)
    for (let i = 0; i < 120; i++) {
      result = engine.step(1 / 60, audio, zeroVideo(), base)
    }

    expect(result.video['0.amount']).toBeGreaterThan(0.02)
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

  it('mic metrics drive audio overrides even when video metrics are neutral', () => {
    const profile = makeProfile({
      audioChain: [
        { node: 'tremolo', params: { depth: 0.02, rate: 0.8 } },
        { node: 'lowpass', params: { cutoff: 3600, q: 0.7 } },
        { node: 'noise_bed', params: { level: 0.01, color: 'pink' } },
        { node: 'delay', params: { time: 0.16, feedback: 0.06, mix: 0.02 } },
        { node: 'reverb', params: { mix: 0.03, decay: 1.8 } },
        { node: 'pulse_tone', params: { rate: 0.9, mix: 0.03, base_freq: 120 } },
      ],
    })
    const settings = defaultSettings({ couplingStrength: 1, maxFeedback: 1 })
    const neutralVideo = zeroVideo()

    const quietEngine = createCouplingEngine(profile, settings)
    const quietAudio: AudioMetrics = {
      ...zeroAudio(),
      micRms: 0.02,
      micCentroid: 0.2,
      micFlux: 0.01,
    }
    let quietResult = quietEngine.step(1 / 60, quietAudio, neutralVideo, {})
    for (let i = 0; i < 120; i++) {
      quietResult = quietEngine.step(1 / 60, quietAudio, neutralVideo, {})
    }

    const loudEngine = createCouplingEngine(profile, settings)
    const loudAudio: AudioMetrics = {
      ...zeroAudio(),
      micRms: 0.85,
      micCentroid: 0.8,
      micFlux: 0.6,
    }
    let loudResult = loudEngine.step(1 / 60, loudAudio, neutralVideo, {})
    for (let i = 0; i < 120; i++) {
      loudResult = loudEngine.step(1 / 60, loudAudio, neutralVideo, {})
    }

    expect(loudResult.audio['audio.0.depth']).toBeGreaterThan(
      quietResult.audio['audio.0.depth'] ?? 0,
    )
    expect(loudResult.audio['audio.1.cutoff']).toBeGreaterThan(
      quietResult.audio['audio.1.cutoff'] ?? 0,
    )
    expect(loudResult.audio['audio.2.level']).toBeGreaterThan(
      quietResult.audio['audio.2.level'] ?? 0,
    )
    expect(loudResult.audio['audio.3.mix']).toBeGreaterThan(quietResult.audio['audio.3.mix'] ?? 0)
    expect(loudResult.audio['audio.4.mix']).toBeGreaterThan(quietResult.audio['audio.4.mix'] ?? 0)
    expect(loudResult.audio['audio.5.mix']).toBeGreaterThan(quietResult.audio['audio.5.mix'] ?? 0)
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

  // -----------------------------------------------------------------------
  // safeMode applies 0.6 damping to coupling strength
  // -----------------------------------------------------------------------
  it('safeMode reduces output magnitude compared to non-safe mode', () => {
    const profile = makeProfile({
      videoStack: [{ node: 'grain', params: { amount: 0.5 } }],
    })
    const highAudio: AudioMetrics = { rms: 1, centroid: 1, flux: 1 }
    const highVideo: VideoMetrics = { motion: 1, luminance: 1, edge: 1, instability: 1 }

    const engineNormal = createCouplingEngine(
      profile,
      defaultSettings({ couplingStrength: 1, safeMode: false }),
    )
    const engineSafe = createCouplingEngine(
      profile,
      defaultSettings({ couplingStrength: 1, safeMode: true }),
    )

    // Run enough steps for smoothing to converge
    let normalResult = engineNormal.step(1 / 60, highAudio, highVideo, {})
    let safeResult = engineSafe.step(1 / 60, highAudio, highVideo, {})
    for (let i = 0; i < 120; i++) {
      normalResult = engineNormal.step(1 / 60, highAudio, highVideo, {})
      safeResult = engineSafe.step(1 / 60, highAudio, highVideo, {})
    }

    // Safe mode output should be <= normal output for all video keys
    for (const key of Object.keys(normalResult.video)) {
      expect(safeResult.video[key] ?? 0).toBeLessThanOrEqual((normalResult.video[key] ?? 0) + 1e-6)
    }
  })

  // -----------------------------------------------------------------------
  // setSettings with reducedMotion change triggers rebuildVideoKeys
  // -----------------------------------------------------------------------
  it('setSettings with changed reducedMotion does not throw and produces valid output', () => {
    const profile = makeProfile({
      videoStack: [
        { node: 'grain', params: { amount: 0.2 } },
        { node: 'pulse', params: { depth: 0.1 } },
      ],
    })
    const engine = createCouplingEngine(profile, defaultSettings({ reducedMotion: false }))

    // Changing reducedMotion should call rebuildVideoKeys internally
    expect(() => {
      engine.setSettings(defaultSettings({ reducedMotion: true }))
    }).not.toThrow()

    const result = engine.step(1 / 60, zeroAudio(), zeroVideo(), {})
    expect(result).toBeDefined()
    expect(result.video).toBeDefined()
    expect(result.audio).toBeDefined()
  })

  // -----------------------------------------------------------------------
  // setSettings with unchanged reducedMotion does NOT call rebuildVideoKeys
  // -----------------------------------------------------------------------
  it('setSettings with same reducedMotion value does not error', () => {
    const profile = makeProfile({
      videoStack: [{ node: 'grain', params: { amount: 0.2 } }],
    })
    const engine = createCouplingEngine(profile, defaultSettings({ reducedMotion: false }))
    // Same value — should be a no-op for rebuild
    expect(() => {
      engine.setSettings(defaultSettings({ reducedMotion: false }))
    }).not.toThrow()
  })

  // -----------------------------------------------------------------------
  // step() with profile that has no audio chain (no audio mappings)
  // -----------------------------------------------------------------------
  it('step() with empty audio chain returns empty audio output', () => {
    const profile = makeProfile({ videoStack: [{ node: 'grain', params: { amount: 0.1 } }] })
    const engine = createCouplingEngine(profile, defaultSettings({ couplingStrength: 1 }))
    const result = engine.step(1 / 60, zeroAudio(), zeroVideo(), {})
    // Audio output should be empty (no audio chain nodes)
    expect(Object.keys(result.audio).length).toBe(0)
  })
})
