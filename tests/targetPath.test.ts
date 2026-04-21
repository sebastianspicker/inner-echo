import { describe, expect, it } from 'vitest'

import { parseScopedTarget } from '../src/utils/targetPath'

describe('utils/targetPath', () => {
  describe('parseScopedTarget with valid input', () => {
    it('parses "video.grain.amount" for video scope', () => {
      const result = parseScopedTarget('video.grain.amount', 'video')
      expect(result).not.toBeNull()
      expect(result!.nodeId).toBe('grain')
      expect(result!.param).toBe('amount')
    })

    it('parses "audio.tremolo.depth" for audio scope', () => {
      const result = parseScopedTarget('audio.tremolo.depth', 'audio')
      expect(result).not.toBeNull()
      expect(result!.nodeId).toBe('tremolo')
      expect(result!.param).toBe('depth')
    })

    it('handles leading/trailing whitespace', () => {
      const result = parseScopedTarget('  video.grain.amount  ', 'video')
      expect(result).not.toBeNull()
      expect(result!.nodeId).toBe('grain')
      expect(result!.param).toBe('amount')
    })

    it('handles mixed case (normalizes to lowercase)', () => {
      const result = parseScopedTarget('Video.Grain.Amount', 'video')
      expect(result).not.toBeNull()
      expect(result!.nodeId).toBe('grain')
      expect(result!.param).toBe('amount')
    })

    it('handles multi-segment param (e.g., nested.param)', () => {
      const result = parseScopedTarget('video.grain.nested.param', 'video')
      expect(result).not.toBeNull()
      expect(result!.nodeId).toBe('grain')
      expect(result!.param).toBe('nested.param')
    })
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
