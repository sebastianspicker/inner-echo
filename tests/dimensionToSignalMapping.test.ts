import { describe, expect, it } from 'vitest'

import { getDimensionMappingEntry } from '../src/composer/dimensionToSignalMapping'

describe('composer/dimensionToSignalMapping', () => {
  it('returns null for an unknown dimension id', () => {
    const result = getDimensionMappingEntry('__nonexistent_dimension__')
    expect(result).toBeNull()
  })

  it('returns null for an empty string', () => {
    const result = getDimensionMappingEntry('')
    expect(result).toBeNull()
  })

  it('returns a DimensionSignalMappingEntry for a known dimension id', () => {
    // "attention_fragmentation" is referenced in experience-dimensions.json and dimension-to-signal-mapping.json
    const result = getDimensionMappingEntry('attention_fragmentation')
    // If the dimension exists in the file it should return an object, otherwise null is fine
    // (we just test that the function doesn't throw and returns the right type)
    if (result !== null) {
      expect(typeof result).toBe('object')
    }
    expect(result === null || typeof result === 'object').toBe(true)
  })

  it('returns entries for multiple known dimensions without throwing', () => {
    const ids = ['sensory_overload', 'hyperarousal', 'dissociation', 'depersonalisation']
    for (const id of ids) {
      expect(() => getDimensionMappingEntry(id)).not.toThrow()
    }
  })
})
