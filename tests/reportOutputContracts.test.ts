import { describe, expect, it } from 'vitest'

import { runInspectHarness } from '../scripts/lib/inspectHarness'
import { verifyContracts } from '../scripts/lib/verifyContracts'

const EXPECTED_PROFILE_IDS = [
  'adhd',
  'anxiety',
  'depression',
  'dpdr',
  'none',
  'ocd',
  'panic',
  'trauma_ptsd',
]

describe('generated report output contracts', () => {
  it('keeps the contract verification report shape and current clean baseline', () => {
    const report = verifyContracts(process.cwd())

    expect(report.summary).toEqual({
      profiles: 8,
      references: 619,
      ok: 208,
      warnings: 0,
      errors: 0,
    })
    expect(report.missingNodes).toEqual([])
    expect(report.missingParams).toEqual([])
    expect(report.unusedParams).toEqual([])
    expect(report.warnings).toEqual([])
    expect(report.errors).toEqual([])
    expect(report.registry.video.length).toBeGreaterThan(0)
    expect(report.registry.audio.length).toBeGreaterThan(0)
  })

  it('keeps the debug inspect report shape and profile coverage stable', async () => {
    const report = await runInspectHarness(process.cwd(), { frames: 4 })

    expect(report.summary).toEqual({
      profiles: 8,
      scenarios: 24,
      ok: 24,
      warnings: 0,
      errors: 0,
    })
    expect(report.profiles.map((profile) => profile.profileId)).toEqual(EXPECTED_PROFILE_IDS)
    expect(report.profiles.every((profile) => profile.video.length === 2)).toBe(true)
    expect(report.profiles.every((profile) => profile.audio.frames === 4)).toBe(true)
    expect(report.warnings).toEqual([])
    expect(report.errors).toEqual([])
  }, 60_000)
})
