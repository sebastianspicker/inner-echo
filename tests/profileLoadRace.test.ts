import { describe, expect, it } from 'vitest'

import { composeEffectiveProfileCore, type ComposeSources } from '../src/composer/composeCore'
import type { Profile } from '../src/conditions/schema'
import type { ComposerSettings } from '../src/composer/types'

/**
 * Tests for race-condition safety in profile loading and composition.
 *
 * The useProfileLoad hook uses useAsyncEffect with a `ctx.cancelled` flag:
 * when deps change before an async load resolves, the cleanup function sets
 * cancelled = true, and the load callback checks ctx.cancelled after each
 * await before updating state. This ensures only the latest result is used.
 *
 * These tests verify that the underlying composeEffectiveProfileCore function
 * is safe to call concurrently — it does not corrupt shared state even when
 * multiple calls are in flight simultaneously.
 */

function makeProfile(id: string, grain: number): Profile {
  return {
    id,
    label: `Profile ${id}`,
    summary: `Test profile ${id}`,
    framing: { type: 'metaphor' },
    experience_dimensions: [],
    safety: {
      intensity_default: 0.5,
      intensity_max: 1,
      warnings: [],
      safe_mode_clamps: {},
      reduced_motion_policy: { disable_nodes: [] },
    },
    video_stack: [{ id: 'grain', node: 'grain', params: { amount: grain } }],
    audio_stack: {
      enabled: false,
      input: 'synth',
      master: { volume: 0.2 },
      chain: [],
    },
    reactive: { analyser_to_params: [] },
    ui: { controls: [] },
    references: { dimensions: [] },
  }
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

describe('profileLoadRace — concurrent compose calls', () => {
  it('concurrent composeEffectiveProfileCore calls produce independent results', async () => {
    const profileA = makeProfile('profile-a', 0.1)
    const profileB = makeProfile('profile-b', 0.9)

    const sources: ComposeSources = {
      async loadPresetProfile(profileId: string) {
        // Simulate network delay — profile A is slower
        if (profileId === 'profile-a') {
          await new Promise((r) => setTimeout(r, 50))
        }
        if (profileId === 'profile-a') return profileA
        if (profileId === 'profile-b') return profileB
        return null
      },
      getDimensionMappingEntry() {
        return null
      },
      getExperienceDimensions() {
        return []
      },
    }

    // Fire both concurrently, simulating rapid condition ID changes
    const [resultA, resultB] = await Promise.all([
      composeEffectiveProfileCore(
        [{ profileId: 'profile-a', weight: 1 }],
        [],
        DEFAULT_SETTINGS,
        sources,
      ),
      composeEffectiveProfileCore(
        [{ profileId: 'profile-b', weight: 1 }],
        [],
        DEFAULT_SETTINGS,
        sources,
      ),
    ])

    // Each result should reflect its own preset — no cross-contamination
    const grainA = resultA.profile.video_stack.find((n) => n.node === 'grain')
    const grainB = resultB.profile.video_stack.find((n) => n.node === 'grain')

    expect(grainA).toBeDefined()
    expect(grainB).toBeDefined()
    // Profile A has grain 0.1, Profile B has grain 0.9
    expect((grainA!.params as Record<string, number>).amount).toBeCloseTo(0.1, 1)
    expect((grainB!.params as Record<string, number>).amount).toBeCloseTo(0.9, 1)
  })

  it('rapid sequential calls do not corrupt shared state', async () => {
    const profiles: Record<string, Profile> = {}
    for (let i = 0; i < 10; i++) {
      profiles[`p${i}`] = makeProfile(`p${i}`, i * 0.1)
    }

    const sources: ComposeSources = {
      async loadPresetProfile(profileId: string) {
        // Variable delays to simulate real network jitter
        await new Promise((r) => setTimeout(r, Math.random() * 20))
        return profiles[profileId] ?? null
      },
      getDimensionMappingEntry() {
        return null
      },
      getExperienceDimensions() {
        return []
      },
    }

    // Launch 10 concurrent compose calls
    const promises = Object.keys(profiles).map((id) =>
      composeEffectiveProfileCore([{ profileId: id, weight: 1 }], [], DEFAULT_SETTINGS, sources),
    )

    const results = await Promise.all(promises)

    // Each result must have exactly one grain node from its respective profile
    for (let i = 0; i < 10; i++) {
      const grain = results[i].profile.video_stack.find((n) => n.node === 'grain')
      expect(grain).toBeDefined()
      const amount = (grain!.params as Record<string, number>).amount
      expect(amount).toBeCloseTo(i * 0.1, 1)
    }
  })

  it('useAsyncEffect cancellation pattern: late resolver is ignored', async () => {
    // Simulates the useAsyncEffect pattern: when condition ID changes rapidly,
    // only the last call's result should be used.
    let activeResult: Profile | null = null
    let seq = 0

    const profileA = makeProfile('slow', 0.2)
    const profileB = makeProfile('fast', 0.8)

    const sources: ComposeSources = {
      async loadPresetProfile(profileId: string) {
        if (profileId === 'slow') {
          await new Promise((r) => setTimeout(r, 100))
          return profileA
        }
        return profileB
      },
      getDimensionMappingEntry() {
        return null
      },
      getExperienceDimensions() {
        return []
      },
    }

    // Simulate two sequential useAsyncEffect invocations
    // First call: slow profile
    const mySeq1 = ++seq
    const p1 = composeEffectiveProfileCore(
      [{ profileId: 'slow', weight: 1 }],
      [],
      DEFAULT_SETTINGS,
      sources,
    ).then((res) => {
      // Only apply if still the active sequence (simulates ctx.cancelled check)
      if (mySeq1 === seq) activeResult = res.profile
    })

    // Second call fires immediately (before first resolves): fast profile
    const mySeq2 = ++seq
    const p2 = composeEffectiveProfileCore(
      [{ profileId: 'fast', weight: 1 }],
      [],
      DEFAULT_SETTINGS,
      sources,
    ).then((res) => {
      if (mySeq2 === seq) activeResult = res.profile
    })

    await Promise.all([p1, p2])

    // The fast profile should win — the slow one's result is discarded
    expect(activeResult).not.toBeNull()
    const grain = activeResult!.video_stack.find((n) => n.node === 'grain')
    expect(grain).toBeDefined()
    expect((grain!.params as Record<string, number>).amount).toBeCloseTo(0.8, 1)
  })

  it('compose with missing preset does not affect concurrent call for valid preset', async () => {
    const profileB = makeProfile('valid', 0.7)

    const sources: ComposeSources = {
      async loadPresetProfile(profileId: string) {
        if (profileId === 'missing') {
          await new Promise((r) => setTimeout(r, 10))
          return null
        }
        return profileB
      },
      getDimensionMappingEntry() {
        return null
      },
      getExperienceDimensions() {
        return []
      },
    }

    const [missingResult, validResult] = await Promise.all([
      composeEffectiveProfileCore(
        [{ profileId: 'missing', weight: 1 }],
        [],
        DEFAULT_SETTINGS,
        sources,
      ),
      composeEffectiveProfileCore(
        [{ profileId: 'valid', weight: 1 }],
        [],
        DEFAULT_SETTINGS,
        sources,
      ),
    ])

    // Missing preset: empty stack, reported as missing
    expect(missingResult.report.missingPresets).toContain('missing')
    expect(missingResult.profile.video_stack).toHaveLength(0)

    // Valid preset: normal result, unaffected
    expect(validResult.report.missingPresets).toHaveLength(0)
    const grain = validResult.profile.video_stack.find((n) => n.node === 'grain')
    expect(grain).toBeDefined()
    expect((grain!.params as Record<string, number>).amount).toBeCloseTo(0.7, 1)
  })
})
