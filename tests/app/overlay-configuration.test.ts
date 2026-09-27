// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BASELINE_PROFILE } from '../../src/domain/experience/fallbackProfile'
import type { Profile } from '../../src/domain/experience/schema'
import { overlayConfigurationKey } from '../../src/app/experience/session/overlayConfiguration'
import { composeEffectiveProfile } from '../../src/app/experience/composeExperience'
import type { ComposerSettings } from '../../src/domain/experience/composition/types'
import {
  useReactivePipeline,
  type UseReactivePipelineParams,
} from '../../src/app/experience/session/useReactivePipeline'

const lifecycle = vi.hoisted(() => ({ start: vi.fn(), dispose: vi.fn() }))
vi.mock('../../src/app/experience/session/reactivePipelineRuntime', () => ({
  createReactiveOverlayLifecycle: () => lifecycle,
  getReactiveOverlayElements: () => ({}),
  reportUnavailable: vi.fn(),
  stopReactiveOverlay: vi.fn(),
}))

function fixture(): Profile {
  return {
    ...BASELINE_PROFILE,
    video_stack: [{ node: 'grain', params: { amount: 0.1 } }],
    audio_stack: { enabled: false, chain: [{ node: 'lowpass', params: { cutoff: 800 } }] },
  }
}

function params(): UseReactivePipelineParams {
  return {
    cameraState: 'active',
    profile: fixture(),
    reducedMotion: false,
    videoRef: { current: null },
    canvasRef: { current: null },
    fallbackCanvasRef: { current: null },
    containerRef: { current: null },
    overlayControlRef: { current: null },
    audioEngineControlRef: { current: null },
    videoMetricsRef: { current: null },
    couplingStrengthRef: { current: 0.3 },
    maxFeedbackRef: { current: 0.5 },
    safeModeRef: { current: true },
    intensityRef: { current: 0.2 },
    controlValuesRef: { current: {} },
    stressModeRef: { current: false },
  }
}

function Harness(props: UseReactivePipelineParams) {
  useReactivePipeline(props)
  return null
}

let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.clearAllMocks()
  root = createRoot(document.createElement('div'))
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})

async function render(props: UseReactivePipelineParams) {
  await act(async () => root.render(createElement(Harness, props)))
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
    const profile = fixture()
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
    const profile = fixture()
    profile.video_stack = [{ node: 'grain', params: { amount: 0.1, scale: 2 } }, { node: 'pulse' }]
    const next = structuredClone(profile)
    next.video_stack[0].params = { scale: 2, amount: 0.1 }
    expect(overlayConfigurationKey(next, false)).toBe(overlayConfigurationKey(profile, false))
    next.video_stack.reverse()
    expect(overlayConfigurationKey(next, false)).not.toBe(overlayConfigurationKey(profile, false))
  })
})

describe('overlay lifecycle reuse', () => {
  it('retains overlay and coupling lifecycle across equivalent profiles and live settings', async () => {
    const current = params()
    await render(current)
    current.safeModeRef.current = false
    current.intensityRef.current = 0.7
    current.controlValuesRef.current = { '0.amount': 0.25 }
    const next = structuredClone(current.profile) as Profile
    next.audio_stack = { ...next.audio_stack, enabled: true, master: { volume: 0.4 } }
    await render({ ...current, profile: next })
    expect(lifecycle.start).toHaveBeenCalledTimes(1)
    expect(lifecycle.dispose).not.toHaveBeenCalled()
  })

  it.each([
    'video',
    'audio',
    'reactive',
    'safety',
    'motion',
    'retry',
  ] as const)('restarts for changed %s configuration', async (change) => {
    const current = params()
    await render(current)
    const profile = structuredClone(current.profile) as Profile
    const next = { ...current, profile }
    if (change === 'video') profile.video_stack[0].params = { amount: 0.3 }
    if (change === 'audio') profile.audio_stack = { chain: [{ node: 'tremolo' }] }
    if (change === 'reactive')
      profile.reactive = { analyser_to_params: [{ source: 'rms', target: 'video.grain.amount' }] }
    if (change === 'safety') profile.safety.safe_mode_clamps.max_intensity = 0.2
    if (change === 'motion') next.reducedMotion = true
    if (change === 'retry') next.retryToken = 1
    await render(next)
    expect(lifecycle.start).toHaveBeenCalledTimes(2)
    expect(lifecycle.dispose).toHaveBeenCalledTimes(1)
  })

  it('tears down and restarts when the camera restarts', async () => {
    const current = params()
    await render(current)
    await render({ ...current, cameraState: 'idle' })
    expect(lifecycle.dispose).toHaveBeenCalledTimes(1)
    await render(current)
    expect(lifecycle.start).toHaveBeenCalledTimes(2)
  })
})
