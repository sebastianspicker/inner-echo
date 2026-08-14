import { describe, expect, it } from 'vitest'

import type { ComposeResult } from '../../src/composer'
import {
  createComposedProfileLoadSuccess,
  createCuratedProfileLoadFailure,
  createCuratedProfileLoadSuccess,
  mergeControlValuesWithDefaults,
  mergePersistedControlValues,
} from '../../src/ui/hooks/profileLoadResults'
import { makeProfile } from '../helpers/useProfileLoadFixtures'

describe('ui/hooks/profileLoadResults', () => {
  it('uses the baseline profile and curated error when a selected profile is unavailable', () => {
    const result = createCuratedProfileLoadFailure(false)

    expect(result.profile.id).toBe('none')
    expect(result.composeReport).toBeNull()
    expect(result.status).toBe('error')
    expect(result.error).toMatch(/could not be loaded/i)
  })

  it('keeps a curated profile intensity default available to the hook', () => {
    const result = createCuratedProfileLoadSuccess(makeProfile('anxiety'), false)

    expect(result.status).toBe('ready')
    expect(result.error).toBeNull()
    expect(result.intensityDefault).toBe(0.5)
  })

  it('preserves compatible composed controls while replacing stale control types', () => {
    const profile = makeProfile('composed')
    const result = createComposedProfileLoadSuccess(
      { profile, report: emptyComposeResult().report },
      false,
    )
    const controls = mergeControlValuesWithDefaults(result.controlValues, {
      intensity: 0.75,
      safeMode: true,
      audioEnabled: 'stale' as unknown as boolean,
    })

    expect(controls.intensity).toBe(0.75)
    expect(controls.safeMode).toBe(true)
    expect(controls.audioEnabled).toBe(false)
  })

  it('preserves only stable profile controls after a reduced-motion default refresh', () => {
    const profile = makeProfile('anxiety')
    const controls = mergePersistedControlValues(profile, true, {
      intensity: 0.7,
      safeMode: true,
      audioEnabled: false,
      stale: 1,
    })

    expect(controls).toMatchObject({ intensity: 0.7, safeMode: true, audioEnabled: false })
    expect(controls).not.toHaveProperty('stale')
  })
})

function emptyComposeResult(): ComposeResult {
  return {
    profile: makeProfile('unused'),
    report: {
      missingNodes: { video: [], audio: [] },
      missingPresets: [],
      evidence: { dimensions: [], gaps: [] },
      warnings: [],
    },
  }
}
