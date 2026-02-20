import { describe, expect, it } from 'vitest'

import { runInspectHarness } from '../scripts/lib/inspectHarness'

describe('debug inspect harness', () => {
  it('inspects all profiles without harness errors', async () => {
    const report = await runInspectHarness(process.cwd(), { frames: 8 })
    expect(report.summary.profiles).toBeGreaterThan(0)
    expect(report.summary.errors).toBe(0)
  })
})
