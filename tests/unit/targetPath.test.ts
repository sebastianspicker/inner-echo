import { describe, expect, it } from 'vitest'

import { parseScopedTarget } from '../../src/utils/targetPath'

describe('utils/targetPath', () => {
  describe('parseScopedTarget with valid input', () => {
    for (const { input, scope, nodeId, param, scenario } of [
      {
        input: 'video.grain.amount',
        scope: 'video',
        nodeId: 'grain',
        param: 'amount',
        scenario: 'parses a video target',
      },
      {
        input: 'audio.tremolo.depth',
        scope: 'audio',
        nodeId: 'tremolo',
        param: 'depth',
        scenario: 'parses an audio target',
      },
      {
        input: '  video.grain.amount  ',
        scope: 'video',
        nodeId: 'grain',
        param: 'amount',
        scenario: 'trims whitespace',
      },
      {
        input: 'Video.Grain.Amount',
        scope: 'video',
        nodeId: 'grain',
        param: 'amount',
        scenario: 'normalizes mixed case',
      },
      {
        input: 'video.grain.nested.param',
        scope: 'video',
        nodeId: 'grain',
        param: 'nested.param',
        scenario: 'preserves multi-segment params',
      },
    ] as const) {
      it(scenario, () => {
        const result = parseScopedTarget(input, scope)
        expect(result).toEqual({ nodeId, param })
      })
    }
  })

  describe('parseScopedTarget with invalid/empty input', () => {
    it('returns null when scope does not match', () => {
      const result = parseScopedTarget('audio.tremolo.depth', 'video')
      expect(result).toBeNull()
    })

    it('returns null for empty string', () => {
      const result = parseScopedTarget('', 'video')
      expect(result).toBeNull()
    })

    it('returns null when only scope prefix is given (no node or param)', () => {
      const result = parseScopedTarget('video.', 'video')
      expect(result).toBeNull()
    })

    it('returns null when only scope and node are given (no param)', () => {
      const result = parseScopedTarget('video.grain', 'video')
      expect(result).toBeNull()
    })

    it('returns null for completely unrelated string', () => {
      const result = parseScopedTarget('something_else', 'video')
      expect(result).toBeNull()
    })

    it('returns null for "video." with trailing dot but no content', () => {
      const result = parseScopedTarget('video.grain.', 'video')
      expect(result).toBeNull()
    })
  })
})
