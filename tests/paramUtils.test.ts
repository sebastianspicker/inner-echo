import { describe, expect, it, vi } from 'vitest'

import {
  resolveBooleanParam,
  resolveNumberParam,
  getGlobalClampNumber,
  getSafeModeClampNumber,
  applyUvParams,
} from '../src/engine/effects/paramUtils'
import type { VideoNodeParams } from '../src/engine/effects/VideoNode'

function makeParams(overrides?: Partial<VideoNodeParams>): VideoNodeParams {
  return {
    intensity: 1,
    safeMode: false,
    controlValues: {},
    nodeIndex: 0,
    ...overrides,
  }
}

describe('engine/effects/paramUtils – resolveBooleanParam', () => {
  it('returns fallback when controlValues is empty', () => {
    expect(resolveBooleanParam(makeParams(), 'enabled', true)).toBe(true)
    expect(resolveBooleanParam(makeParams(), 'enabled', false)).toBe(false)
  })

  it('returns keyed value (nodeIndex.key) when present', () => {
    const params = makeParams({ nodeIndex: 2, controlValues: { '2.enabled': true } })
    expect(resolveBooleanParam(params, 'enabled', false)).toBe(true)
  })

  it('returns unkeyed value when nodeIndex-keyed form is absent', () => {
    const params = makeParams({ nodeIndex: 0, controlValues: { enabled: false } })
    expect(resolveBooleanParam(params, 'enabled', true)).toBe(false)
  })

  it('ignores non-boolean values in controlValues and falls through to fallback', () => {
    // number stored under key should not match boolean check
    const params = makeParams({ controlValues: { '0.enabled': 1 as unknown as boolean } })
    expect(resolveBooleanParam(params, 'enabled', true)).toBe(true)
  })

  it('prefers nodeIndex-keyed value over unkeyed value', () => {
    const params = makeParams({
      nodeIndex: 3,
      controlValues: { '3.flag': true, flag: false },
    })
    expect(resolveBooleanParam(params, 'flag', false)).toBe(true)
  })
})

describe('engine/effects/paramUtils – resolveNumberParam', () => {
  it('returns fallback when controlValues is empty', () => {
    expect(resolveNumberParam(makeParams(), 'amount', 0.5)).toBe(0.5)
  })

  it('returns keyed value (nodeIndex.key)', () => {
    const params = makeParams({ nodeIndex: 1, controlValues: { '1.amount': 0.9 } })
    expect(resolveNumberParam(params, 'amount', 0)).toBe(0.9)
  })

  it('returns unkeyed value when keyed form absent', () => {
    const params = makeParams({ controlValues: { amount: 0.7 } })
    expect(resolveNumberParam(params, 'amount', 0)).toBe(0.7)
  })
})

describe('engine/effects/paramUtils – getGlobalClampNumber / getSafeModeClampNumber', () => {
  it('getGlobalClampNumber returns fallback when safetyContext absent', () => {
    expect(getGlobalClampNumber(makeParams(), 'max_luminance_delta_per_frame', 0.25)).toBe(0.25)
  })

  it('getGlobalClampNumber reads from safetyContext.global', () => {
    const params = makeParams({
      safetyContext: { global: { max_luminance_delta_per_frame: 0.1 }, safeMode: {} },
    })
    expect(getGlobalClampNumber(params, 'max_luminance_delta_per_frame', 0.25)).toBe(0.1)
  })

  it('getSafeModeClampNumber returns fallback when safetyContext absent', () => {
    expect(getSafeModeClampNumber(makeParams(), 'max_intensity', 1)).toBe(1)
  })

  it('getSafeModeClampNumber reads from safetyContext.safeMode', () => {
    const params = makeParams({
      safetyContext: { global: {}, safeMode: { max_intensity: 0.5 } },
    })
    expect(getSafeModeClampNumber(params, 'max_intensity', 1)).toBe(0.5)
  })
})

describe('engine/effects/paramUtils – applyUvParams', () => {
  it('calls set on uvScale and uvOffset uniforms when arrays are valid', () => {
    const setScale = vi.fn()
    const setOffset = vi.fn()
    const material = {
      uniforms: {
        u_uvScale: { value: { set: setScale } },
        u_uvOffset: { value: { set: setOffset } },
      },
    }
    const params = makeParams({ uvScale: [1.5, 1.5], uvOffset: [0.1, 0.2] })
    applyUvParams(material, params)
    expect(setScale).toHaveBeenCalledWith(1.5, 1.5)
    expect(setOffset).toHaveBeenCalledWith(0.1, 0.2)
  })

  it('does not throw when uvScale/uvOffset are absent', () => {
    const material = { uniforms: {} }
    expect(() => applyUvParams(material, makeParams())).not.toThrow()
  })
})
