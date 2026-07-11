import { describe, expect, it } from 'vitest'
import { createFastRandom } from '../src/utils/fastRandom'

describe('fast audiovisual PRNG', () => {
  it('is deterministic for an injected seed', () => {
    const first = createFastRandom(1234)
    const second = createFastRandom(1234)
    expect(Array.from({ length: 8 }, first)).toEqual(Array.from({ length: 8 }, second))
  })

  it('stays within the half-open unit interval', () => {
    const random = createFastRandom(0)
    for (let index = 0; index < 1_000; index += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
