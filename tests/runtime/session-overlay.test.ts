// @vitest-environment jsdom
//
// Characterizes the overlay manager's restart/reuse contract (docs/ARCHITECTURE.md
// "Rendering and bundle boundaries"): equivalent profiles keep the running lifecycle;
// changed video/audio/reactive/safety/motion definitions, explicit retry, and camera
// leaving/re-entering 'active' all restart it. Uses the real graph/coupling/overlay
// modules (no vi.mock by path); only the video element is a plain fake.
import { describe, expect, it, vi } from 'vitest'
import { BASELINE_PROFILE } from '../../src/domain/experience/fallbackProfile'
import type { Profile } from '../../src/domain/experience/schema'
import type { ComposerSettings } from '../../src/domain/experience/composition/types'
import { composeEffectiveProfile } from '../../src/app/experience/profile/composeExperience'
import {
  createOverlayManager,
  loadOverlayModules,
  overlayConfigurationKey,
} from '../../src/runtime/session/overlay'
import type { LiveSettings, StageElements } from '../../src/runtime/session/types'

function fixtureProfile(): Profile {
  return {
    ...BASELINE_PROFILE,
    video_stack: [{ node: 'grain', params: { amount: 0.1 } }],
    audio_stack: { enabled: false, chain: [{ node: 'lowpass', params: { cutoff: 800 } }] },
  }
}

function liveSettings(
  profile: Profile | null,
  overrides: Partial<LiveSettings> = {},
): LiveSettings {
  return {
    profile,
    reducedMotion: false,
    safeMode: true,
    intensity: 0.2,
    stressMode: false,
    controlValues: {},
    couplingStrength: 0.3,
    maxFeedback: 0.5,
    diagnosticsActive: false,
    ...overrides,
  }
}

function fakeVideo(): HTMLVideoElement {
  return {
    readyState: 1,
    videoWidth: 2,
    videoHeight: 2,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLVideoElement
}

function fakeStage(): StageElements {
  return {
    video: fakeVideo(),
    canvas: document.createElement('canvas'),
    fallbackCanvas: document.createElement('canvas'),
    container: document.createElement('div'),
  }
}

/** The real graph/coupling/canvas modules load via a real dynamic import, which needs
 * more than a microtask flush; wait for the observable outcome instead of a tick count. */
async function waitForControl(
  getControl: () => unknown,
  previous: unknown = undefined,
): Promise<void> {
  await vi.waitFor(() => {
    const control = getControl()
    if (!control || control === previous) throw new Error('overlay control not ready yet')
  })
}

function createManager() {
  return createOverlayManager({
    loadOverlayModules,
    getAudioControl: () => null,
    onStateChange: () => {},
  })
}

describe('overlay configuration identity', () => {
  it('retains configuration across actual Safe Mode and sound recomposition', async () => {
    const settings: ComposerSettings = {
      intensity: 0.3,
      safeMode: true,
      reducedMotion: false,
      audioEnabled: false,
      micEnabled: false,
      couplingStrength: 0,
      maxFeedback: 0.5,
      interactionAmount: 0.2,
      debugOverlay: false,
    }
    const dimensions = [{ dimensionId: 'hyperarousal', weight: 0.5 }]
    const before = await composeEffectiveProfile([], dimensions, settings)
    const after = await composeEffectiveProfile([], dimensions, {
      ...settings,
      safeMode: false,
      audioEnabled: true,
    })
    expect(after.profile).not.toEqual(before.profile)
    expect(overlayConfigurationKey(after.profile, false)).toBe(
      overlayConfigurationKey(before.profile, false),
    )
  })

  it('ignores presentation, sound enablement, volume and control definitions', () => {
    const profile = fixtureProfile()
    const next = {
      ...profile,
      label: 'Changed label',
      summary: 'Changed summary',
      audio_stack: { ...profile.audio_stack, enabled: true, master: { volume: 0.5 } },
      safety: { ...profile.safety, warnings: ['Changed warning'], intensity_default: 0.1 },
      ui: { controls: [] },
    }
    expect(overlayConfigurationKey(next, false)).toBe(overlayConfigurationKey(profile, false))
  })

  it('normalizes object key order while preserving stack order', () => {
    const profile = fixtureProfile()
    profile.video_stack = [{ node: 'grain', params: { amount: 0.1, scale: 2 } }, { node: 'pulse' }]
    const next = structuredClone(profile)
    next.video_stack[0].params = { scale: 2, amount: 0.1 }
    expect(overlayConfigurationKey(next, false)).toBe(overlayConfigurationKey(profile, false))
    next.video_stack.reverse()
    expect(overlayConfigurationKey(next, false)).not.toBe(overlayConfigurationKey(profile, false))
  })
})

async function startActiveManager(profile: Profile) {
  const manager = createManager()
  manager.attachStage(fakeStage())
  manager.setCameraActive(true)
  manager.setLiveSettings(liveSettings(profile))
  await waitForControl(manager.getControl)
  return { manager, firstControl: manager.getControl() }
}

describe('overlay lifecycle reuse', () => {
  it('retains the overlay and coupling lifecycle across equivalent profiles and live settings', async () => {
    const profile = fixtureProfile()
    const { manager, firstControl } = await startActiveManager(profile)

    const next = structuredClone(profile) as Profile
    next.audio_stack = { ...next.audio_stack, enabled: true, master: { volume: 0.4 } }
    manager.setLiveSettings(
      liveSettings(next, { safeMode: false, intensity: 0.7, controlValues: { '0.amount': 0.25 } }),
    )

    expect(manager.getControl()).toBe(firstControl)
  })

  it.each([
    'video',
    'audio',
    'reactive',
    'safety',
    'motion',
  ] as const)('restarts for changed %s configuration', async (change) => {
    const profile = fixtureProfile()
    const { manager, firstControl } = await startActiveManager(profile)

    const next = structuredClone(profile) as Profile
    if (change === 'video') next.video_stack[0].params = { amount: 0.3 }
    if (change === 'audio') next.audio_stack = { chain: [{ node: 'tremolo' }] }
    if (change === 'reactive') {
      next.reactive = { analyser_to_params: [{ source: 'rms', target: 'video.grain.amount' }] }
    }
    if (change === 'safety') next.safety.safe_mode_clamps.max_intensity = 0.2
    const settings = liveSettings(next, { reducedMotion: change === 'motion' })
    manager.setLiveSettings(settings)
    await waitForControl(manager.getControl, firstControl)

    expect(manager.getControl()).not.toBe(firstControl)
  })

  it('restarts on explicit retry even for an equivalent configuration', async () => {
    const { manager, firstControl } = await startActiveManager(fixtureProfile())

    manager.retry()
    await waitForControl(manager.getControl, firstControl)

    expect(manager.getControl()).not.toBe(firstControl)
  })

  it('tears down and restarts when the camera leaves and re-enters active', async () => {
    const { manager, firstControl } = await startActiveManager(fixtureProfile())

    manager.setCameraActive(false)
    expect(manager.getControl()).toBeNull()
    expect(manager.getState().rendererMode).toBe('unavailable')

    manager.setCameraActive(true)
    await waitForControl(manager.getControl, firstControl)

    expect(manager.getControl()).not.toBe(firstControl)
  })
})
