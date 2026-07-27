import { describe, expect, it } from 'vitest'

import {
  mergeParams,
  scaleNumericParams,
  sortStackKeys,
  mergeNumericWeighted,
  normalizeNodeType,
  makeIdForNode,
  mergeWarnings,
  mergeDisableNodes,
  mergeSafeModeClamps,
  motifsToVideoDefs,
  motifsToAudioDefs,
} from '../../src/composer/composeBlend'

describe('composer/composeBlend', () => {
  describe('mergeParams', () => {
    it('merges overlapping numeric keys via weighted average', () => {
      const result = mergeParams([
        { w: 0.5, params: { amount: 0.2 }, source: 'a' },
        { w: 0.5, params: { amount: 0.8 }, source: 'b' },
      ])

      // Weighted average: (0.2 * 0.5 + 0.8 * 0.5) / (0.5 + 0.5) = 0.5
      expect(result.amount).toBeCloseTo(0.5)
    })

    it('merges non-overlapping keys by including both', () => {
      const result = mergeParams([
        { w: 1, params: { alpha: 0.3 }, source: 'a' },
        { w: 1, params: { beta: 0.7 }, source: 'b' },
      ])

      expect(result.alpha).toBeCloseTo(0.3)
      expect(result.beta).toBeCloseTo(0.7)
    })

    it('for non-numeric overlapping keys, picks highest-weight value', () => {
      const result = mergeParams([
        { w: 0.3, params: { mode: 'low' }, source: 'a' },
        { w: 0.8, params: { mode: 'high' }, source: 'b' },
      ])

      expect(result.mode).toBe('high')
    })

    it('handles empty contribs', () => {
      const result = mergeParams([])
      expect(result).toEqual({})
    })

    it('filters out __proto__ key for prototype pollution safety', () => {
      const result = mergeParams([{ w: 1, params: { __proto__: 'bad', safe: 1 }, source: 'a' }])

      expect(result.safe).toBe(1)
      expect(Object.keys(result)).not.toContain('__proto__')
    })

    it('filters out constructor and prototype keys', () => {
      const result = mergeParams([
        { w: 1, params: { constructor: 'bad', prototype: 'bad', ok: 2 }, source: 'a' },
      ])

      expect(result.ok).toBe(2)
      expect(Object.keys(result)).not.toContain('constructor')
      expect(Object.keys(result)).not.toContain('prototype')
    })
  })

  describe('scaleNumericParams', () => {
    it('scales numeric values by strength factor', () => {
      const result = scaleNumericParams({ amount: 0.8, rate: 4 }, 0.5)
      expect(result.amount).toBeCloseTo(0.4)
      expect(result.rate).toBeCloseTo(2)
    })

    it('with 0 weight, all numeric values become 0', () => {
      const result = scaleNumericParams({ amount: 0.8, rate: 4 }, 0)
      expect(result.amount).toBe(0)
      expect(result.rate).toBe(0)
    })

    it('with 1 weight, numeric values are unchanged', () => {
      const result = scaleNumericParams({ amount: 0.8, rate: 4 }, 1)
      expect(result.amount).toBeCloseTo(0.8)
      expect(result.rate).toBeCloseTo(4)
    })

    it('leaves non-numeric values unchanged regardless of weight', () => {
      const result = scaleNumericParams(
        { mode: 'pink', amount: 0.5 } as Record<string, unknown>,
        0.5,
      )
      expect(result.mode).toBe('pink')
      expect(result.amount).toBeCloseTo(0.25)
    })
  })

  describe('sortStackKeys', () => {
    it('sorts by minOrderGroup first, then minIndex, then node, then key', () => {
      const items = [
        { key: 'vignette', node: 'vignette', minIndex: 0, minOrderGroup: 25 },
        { key: 'grain', node: 'grain', minIndex: 0, minOrderGroup: 10 },
        { key: 'temporal', node: 'temporal_smear', minIndex: 0, minOrderGroup: 60 },
      ]

      sortStackKeys(items)

      expect(items[0].key).toBe('grain')
      expect(items[1].key).toBe('vignette')
      expect(items[2].key).toBe('temporal')
    })

    it('items with the same order group sort by minIndex', () => {
      const items = [
        { key: 'b', node: 'grain', minIndex: 5, minOrderGroup: 10 },
        { key: 'a', node: 'grain', minIndex: 1, minOrderGroup: 10 },
      ]

      sortStackKeys(items)

      expect(items[0].key).toBe('a')
      expect(items[1].key).toBe('b')
    })

    it('returns the same array reference (sorts in-place)', () => {
      const items = [
        { key: 'b', node: 'b', minIndex: 0, minOrderGroup: 20 },
        { key: 'a', node: 'a', minIndex: 0, minOrderGroup: 10 },
      ]

      const returned = sortStackKeys(items)
      expect(returned).toBe(items)
    })
  })

  describe('mergeNumericWeighted', () => {
    it('weighted average of two equal-weight items', () => {
      const result = mergeNumericWeighted([
        { w: 1, v: 0.2 },
        { w: 1, v: 0.8 },
      ])
      expect(result).toBeCloseTo(0.5)
    })

    it('returns 0 for empty input', () => {
      expect(mergeNumericWeighted([])).toBe(0)
    })

    it('skips items with zero weight', () => {
      const result = mergeNumericWeighted([
        { w: 0, v: 100 },
        { w: 1, v: 0.5 },
      ])
      expect(result).toBeCloseTo(0.5)
    })

    it('skips non-finite values', () => {
      const result = mergeNumericWeighted([
        { w: 1, v: NaN },
        { w: 1, v: 0.4 },
      ])
      expect(result).toBeCloseTo(0.4)
    })
  })

  describe('normalizeNodeType', () => {
    it('lowercases and trims node type', () => {
      expect(normalizeNodeType('  Grain  ')).toBe('grain')
      expect(normalizeNodeType('TEMPORAL_SMEAR')).toBe('temporal_smear')
    })
  })

  describe('makeIdForNode', () => {
    it('returns id when present', () => {
      expect(makeIdForNode({ id: 'my-grain', node: 'grain' })).toBe('my-grain')
    })

    it('falls back to node when id is undefined', () => {
      expect(makeIdForNode({ node: 'grain' })).toBe('grain')
    })
  })

  describe('mergeWarnings', () => {
    it('deduplicates warnings across lists', () => {
      const result = mergeWarnings([
        ['Warning A', 'Warning B'],
        ['Warning B', 'Warning C'],
      ])
      expect(result).toEqual(['Warning A', 'Warning B', 'Warning C'])
    })

    it('trims and skips empty strings', () => {
      const result = mergeWarnings([['  Hello  ', '', '  ']])
      expect(result).toEqual(['Hello'])
    })
  })

  describe('mergeDisableNodes', () => {
    it('deduplicates and lowercases node names', () => {
      const result = mergeDisableNodes([
        ['Temporal_Smear', 'PULSE'],
        ['pulse', 'grain'],
      ])
      expect(result).toEqual(['grain', 'pulse', 'temporal_smear'])
    })

    it('handles undefined lists', () => {
      const result = mergeDisableNodes([undefined, ['grain'], undefined])
      expect(result).toEqual(['grain'])
    })

    it('returns sorted empty array for all-undefined input', () => {
      const result = mergeDisableNodes([undefined, undefined])
      expect(result).toEqual([])
    })
  })

  describe('motifsToVideoDefs', () => {
    it('converts motifs with params_hint containing numeric ranges', () => {
      const result = motifsToVideoDefs([{ node: 'grain', params_hint: { amount: '0.1 - 0.5' } }])
      expect(result).toHaveLength(1)
      expect(result[0].node).toBe('grain')
      // With strength=1, should pick the high end of the range
      expect(result[0].params.amount).toBeCloseTo(0.5)
    })

    it('converts motifs with empty params_hint', () => {
      const result = motifsToVideoDefs([{ node: 'vignette' }])
      expect(result).toHaveLength(1)
      expect(result[0].node).toBe('vignette')
      expect(result[0].params).toEqual({})
    })

    it('handles duplicate node types', () => {
      const result = motifsToVideoDefs([
        { node: 'grain', params_hint: { amount: '0.2' } },
        { node: 'grain', params_hint: { amount: '0.8' } },
      ])
      expect(result).toHaveLength(2)
      expect(result[0].node).toBe('grain')
      expect(result[1].node).toBe('grain')
    })

    it('returns empty array for undefined input', () => {
      expect(motifsToVideoDefs(undefined)).toEqual([])
    })

    it('returns empty array for empty input', () => {
      expect(motifsToVideoDefs([])).toEqual([])
    })

    it('normalizes node type to lowercase', () => {
      const result = motifsToVideoDefs([{ node: '  GRAIN  ' }])
      expect(result[0].node).toBe('grain')
    })

    it('resolves color string hints (pink/brown/white)', () => {
      const result = motifsToVideoDefs([{ node: 'noise_bed', params_hint: { type: 'pink noise' } }])
      expect(result[0].params.type).toBe('pink')
    })
  })

  describe('motifsToAudioDefs', () => {
    it('converts audio motifs to node+params format', () => {
      const result = motifsToAudioDefs([{ node: 'reverb', params_hint: { decay: '0.5 - 2.0' } }])
      expect(result).toHaveLength(1)
      expect(result[0].node).toBe('reverb')
      expect(result[0].params.decay).toBeCloseTo(2.0)
    })

    it('returns empty array for undefined input', () => {
      expect(motifsToAudioDefs(undefined)).toEqual([])
    })

    it('returns empty array for empty motifs', () => {
      expect(motifsToAudioDefs([])).toEqual([])
    })

    it('handles motifs without params_hint', () => {
      const result = motifsToAudioDefs([{ node: 'delay' }])
      expect(result[0].params).toEqual({})
    })
  })

  describe('mergeSafeModeClamps', () => {
    it('merges overlapping numeric keys by picking minimum', () => {
      const result = mergeSafeModeClamps([
        { amount: 0.8, rate: 5 },
        { amount: 0.3, rate: 10 },
      ])
      expect(result.amount).toBe(0.3)
      expect(result.rate).toBe(5)
    })

    it('merges boolean keys with logical OR', () => {
      const result = mergeSafeModeClamps([{ enabled: false }, { enabled: true }])
      expect(result.enabled).toBe(true)
    })

    it('handles empty clamps', () => {
      const result = mergeSafeModeClamps([{}, {}])
      expect(result).toEqual({})
    })

    it('handles undefined items in the array', () => {
      const result = mergeSafeModeClamps([undefined, { amount: 0.5 }, undefined])
      expect(result.amount).toBe(0.5)
    })

    it('filters out prototype pollution keys', () => {
      const result = mergeSafeModeClamps([
        { __proto__: 'bad', safe: 0.5 } as Record<string, unknown>,
      ])
      expect(Object.keys(result)).not.toContain('__proto__')
      expect(result.safe).toBe(0.5)
    })

    it('mixed numeric and boolean values fall back to first value', () => {
      // When values are mixed types (not all numeric, not all boolean), uses first
      const result = mergeSafeModeClamps([{ mixed: 0.5 }, { mixed: true as unknown }])
      expect(result.mixed).toBe(0.5)
    })

    it('sorts keys alphabetically', () => {
      const result = mergeSafeModeClamps([{ zebra: 1, alpha: 2 }])
      const keys = Object.keys(result)
      expect(keys).toEqual(['alpha', 'zebra'])
    })
  })

  describe('mergeWarnings (additional)', () => {
    it('deduplicates identical warnings', () => {
      const result = mergeWarnings([['Same warning', 'Same warning', 'Same warning']])
      expect(result).toEqual(['Same warning'])
    })

    it('handles empty lists gracefully', () => {
      const result = mergeWarnings([[], []])
      expect(result).toEqual([])
    })

    it('handles null-ish list entries', () => {
      const result = mergeWarnings([null as unknown as string[], ['OK']])
      expect(result).toEqual(['OK'])
    })
  })

  describe('mergeDisableNodes (additional)', () => {
    it('returns union of all sets', () => {
      const result = mergeDisableNodes([['grain'], ['vignette'], ['pulse']])
      expect(result).toEqual(['grain', 'pulse', 'vignette'])
    })

    it('empty arrays produce empty result', () => {
      const result = mergeDisableNodes([[], []])
      expect(result).toEqual([])
    })
  })
})
