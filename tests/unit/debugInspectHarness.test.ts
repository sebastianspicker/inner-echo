import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { runInspectHarness } from '../../scripts/lib/inspectHarness'

const harnessTestState = vi.hoisted(() => ({
  injectVideoFailure: false,
  limitProfiles: false,
  createdNodes: [] as Array<{ disposeCalls: number }>,
}))

vi.mock('../../src/conditions/graphBuilder', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/conditions/graphBuilder')>()
  return {
    ...actual,
    buildVideoNodes: (...args: Parameters<typeof actual.buildVideoNodes>) => {
      if (!harnessTestState.injectVideoFailure) return actual.buildVideoNodes(...args)

      const nonFiniteNode = {
        disposeCalls: 0,
        needsPreviousFrame: false,
        setParams: () => {},
        getMaterial: () => ({ uniforms: { corrupted: { value: Number.NaN } } }),
        dispose() {
          this.disposeCalls++
        },
      }
      const throwingNode = {
        disposeCalls: 0,
        needsPreviousFrame: false,
        setParams: () => {
          throw new Error('expected video node crash')
        },
        getMaterial: () => ({ uniforms: {} }),
        dispose() {
          this.disposeCalls++
        },
      }
      harnessTestState.createdNodes.push(nonFiniteNode, throwingNode)
      return [nonFiniteNode, throwingNode] as unknown as ReturnType<typeof actual.buildVideoNodes>
    },
  }
})

vi.mock('../../scripts/lib/profileContracts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../scripts/lib/profileContracts')>()
  return {
    ...actual,
    loadProfileContracts: (...args: Parameters<typeof actual.loadProfileContracts>) => {
      const loaded = actual.loadProfileContracts(...args)
      return harnessTestState.limitProfiles
        ? { ...loaded, profiles: loaded.profiles.slice(0, 1) }
        : loaded
    },
  }
})

afterEach(() => {
  harnessTestState.injectVideoFailure = false
  harnessTestState.limitProfiles = false
  harnessTestState.createdNodes.length = 0
  vi.restoreAllMocks()
})

describe('debug inspect harness', () => {
  it('keeps the minimum frame count and scenario order stable without harness errors', async () => {
    const report = await runInspectHarness(process.cwd(), { frames: 0 })
    expect(report.summary.profiles).toBeGreaterThan(0)
    expect(report.summary.errors).toBe(0)
    for (const profile of report.profiles) {
      expect(profile.video).toMatchObject([
        { reducedMotion: false, safeMode: false, frames: 1 },
        { reducedMotion: true, safeMode: true, frames: 1 },
      ])
      expect(profile.audio.frames).toBe(1)
      expect(profile.audio.nonFiniteReadings).toBe(0)
    }
  }, 120_000)

  it('retains a non-finite reading when a later node crashes and disposes all resources', async () => {
    harnessTestState.injectVideoFailure = true
    harnessTestState.limitProfiles = true
    const textureDispose = vi.spyOn(THREE.Texture.prototype, 'dispose')

    const report = await runInspectHarness(process.cwd(), { frames: 1 })

    expect(report.profiles).toHaveLength(1)
    expect(report.profiles[0]?.video.map((scenario) => scenario.nonFiniteReadings)).toEqual([1, 1])
    expect(report.profiles[0]?.errors).toBe(4)
    expect(report.errors.map(({ code, message }) => [code, message])).toEqual([
      ['VIDEO_NON_FINITE_UNIFORM', 'Non-finite uniform values detected (1)'],
      ['VIDEO_SCENARIO_CRASH', 'expected video node crash'],
      ['VIDEO_NON_FINITE_UNIFORM', 'Non-finite uniform values detected (1)'],
      ['VIDEO_SCENARIO_CRASH', 'expected video node crash'],
    ])
    expect(harnessTestState.createdNodes).toHaveLength(4)
    expect(harnessTestState.createdNodes.every((node) => node.disposeCalls === 1)).toBe(true)
    expect(textureDispose).toHaveBeenCalledTimes(4)
  })

  it('inspects all profiles for 30 dynamic frames without harness errors', async () => {
    const report = await runInspectHarness(process.cwd(), { frames: 30 })

    expect(report.summary.profiles).toBeGreaterThan(0)
    expect(report.summary.errors).toBe(0)
    expect(
      report.profiles.every((profile) => profile.video.every((scenario) => scenario.frames === 30)),
    ).toBe(true)
    expect(report.profiles.every((profile) => profile.audio.frames === 30)).toBe(true)
  }, 120_000)
})
