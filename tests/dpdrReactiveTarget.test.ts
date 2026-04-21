import { describe, expect, test } from 'vitest'
import dpdr from '../src/conditions/profiles/dpdr.json'
import { resolveAnalyserTarget } from '../src/engine/reactive/analyserToParamsResolver'
import type { Profile } from '../src/conditions/schema'

describe('dpdr reactive targets', () => {
  test('all analyser targets resolve', () => {
    const reactive = dpdr.reactive?.analyser_to_params ?? []
    expect(reactive.length).toBeGreaterThan(0)
    for (const mapping of reactive) {
      const resolved = resolveAnalyserTarget(mapping.target, dpdr as Profile, {
        reducedMotion: false,
      })
      expect(resolved, `target should resolve: ${mapping.target}`).not.toBeNull()
    }
  })
})
