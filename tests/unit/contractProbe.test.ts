import { describe, expect, it } from 'vitest'
import { audioNodeDefinitions } from '../../src/contractVerification/audioNodeRegistry'
import { videoNodeDefinitions } from '../../src/contractVerification/videoNodeRegistry'
import type { ContractNodeDefinition } from '../../src/contractVerification/types'
import { asNumber, differs, outOfRangeLow, outOfRangeHigh } from '../../scripts/lib/verifyContracts'
import { probeHigh } from '../helpers/contractProbeHigh'
import { probeLow } from '../helpers/contractProbeLow'

function runUsageProbe(
  def: ContractNodeDefinition,
  param: string,
): { changed: boolean; low: unknown; high: unknown; observedLow: unknown; observedHigh: unknown } {
  const meta = def.params[param]
  const low = probeLow(meta)
  const high = probeHigh(meta)
  const lowHarness = def.createHarness()
  let observedLow: unknown
  try {
    lowHarness.applyParam(param, low, { intensity: 1, safeMode: false })
    observedLow = meta.readEffective(lowHarness)
  } finally {
    lowHarness.dispose()
  }

  const highHarness = def.createHarness()
  let observedHigh: unknown
  try {
    highHarness.applyParam(param, high, { intensity: 1, safeMode: false })
    observedHigh = meta.readEffective(highHarness)
  } finally {
    highHarness.dispose()
  }

  return {
    changed: differs(observedLow, observedHigh, meta.epsilon ?? 1e-6),
    low,
    high,
    observedLow,
    observedHigh,
  }
}

function runRangeProbe(
  def: ContractNodeDefinition,
  param: string,
): {
  pass: boolean
  observedLow: number | null
  observedHigh: number | null
  min: number
  max: number
} | null {
  const meta = def.params[param]
  if (meta.type !== 'number' || typeof meta.min !== 'number' || typeof meta.max !== 'number') {
    return null
  }

  const lowHarness = def.createHarness()
  let observedLow: number | null = null
  try {
    lowHarness.applyParam(param, outOfRangeLow(meta.min), { intensity: 1, safeMode: false })
    observedLow = asNumber(meta.readEffective(lowHarness))
  } finally {
    lowHarness.dispose()
  }

  const highHarness = def.createHarness()
  let observedHigh: number | null = null
  try {
    highHarness.applyParam(param, outOfRangeHigh(meta.max), { intensity: 1, safeMode: false })
    observedHigh = asNumber(meta.readEffective(highHarness))
  } finally {
    highHarness.dispose()
  }

  const eps = meta.epsilon ?? 1e-6
  const pass =
    observedLow != null &&
    observedHigh != null &&
    observedLow >= meta.min - eps &&
    observedHigh <= meta.max + eps

  return {
    pass,
    observedLow,
    observedHigh,
    min: meta.min,
    max: meta.max,
  }
}

function expectEveryParamHasMeasurableEffect(definitions: ContractNodeDefinition[]): void {
  const failures: string[] = []
  for (const def of definitions) {
    for (const param of Object.keys(def.params)) {
      const usage = runUsageProbe(def, param)
      if (!usage.changed) {
        failures.push(
          `${def.kind}.${def.node}.${param} low=${String(usage.low)} high=${String(
            usage.high,
          )} observedLow=${String(usage.observedLow)} observedHigh=${String(usage.observedHigh)}`,
        )
      }
    }
  }
  expect(failures).toEqual([])
}

describe('contract probe coverage', () => {
  it('every video node param has measurable runtime effect', () => {
    expectEveryParamHasMeasurableEffect(videoNodeDefinitions)
  })

  it('every audio node param has measurable runtime effect', () => {
    expectEveryParamHasMeasurableEffect(audioNodeDefinitions)
  })

  it('all numeric params clamp out-of-range inputs', () => {
    const failures: string[] = []
    for (const def of [...videoNodeDefinitions, ...audioNodeDefinitions]) {
      for (const param of Object.keys(def.params)) {
        const range = runRangeProbe(def, param)
        if (!range) continue
        if (!range.pass) {
          failures.push(
            `${def.kind}.${def.node}.${param} min=${range.min} max=${range.max} observedLow=${String(
              range.observedLow,
            )} observedHigh=${String(range.observedHigh)}`,
          )
        }
      }
    }
    expect(failures).toEqual([])
  })
})
