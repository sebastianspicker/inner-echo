import { describe, expect, it } from 'vitest'

import { parseFirstJsonObject } from '../../src/utils/jsonObjectParser'

describe('utils/jsonObjectParser', () => {
  it('parses a clean JSON object directly', () => {
    const value = parseFirstJsonObject<{ mapping: Record<string, unknown> }>(
      '{"mapping":{"a":1}}',
      {
        predicate(v) {
          const mapping = (v as { mapping?: unknown }).mapping
          return mapping != null && typeof mapping === 'object'
        },
      },
    )
    expect(value.mapping).toEqual({ a: 1 })
  })

  it('throws on empty string', () => {
    expect(() => parseFirstJsonObject('')).toThrow('No valid JSON object found')
  })

  it('throws on input exceeding max length', () => {
    const huge = 'a'.repeat(1_048_577)
    expect(() => parseFirstJsonObject(huge)).toThrow('Input too large (1048577 chars, max 1048576)')
  })

  it('skips earlier object candidates that do not satisfy predicate', () => {
    const text = ['prefix text', '{"note":"not-the-object"}', '{"mapping":{"ok":true}}'].join('\n')

    const value = parseFirstJsonObject<{ mapping: { ok: boolean } }>(text, {
      predicate(v) {
        const mapping = (v as { mapping?: unknown }).mapping
        return mapping != null && typeof mapping === 'object'
      },
    })

    expect(value.mapping.ok).toBe(true)
  })

  it('continues after a malformed balanced candidate', () => {
    const value = parseFirstJsonObject<{ mapping: { recovered: boolean } }>(
      'prefix {"broken":} then {"mapping":{"recovered":true}}',
      { predicate: hasMapping },
    )

    expect(value).toEqual({ mapping: { recovered: true } })
  })

  it('does not treat braces or escaped quotes inside JSON strings as object boundaries', () => {
    const value = parseFirstJsonObject<{ mapping: { message: string } }>(
      'prefix {"mapping":{"message":"brace } and escaped quote \\" with {"}}',
      { predicate: hasMapping },
    )

    expect(value).toEqual({ mapping: { message: 'brace } and escaped quote " with {' } })
  })

  it('rejects an array even when its predicate accepts every value', () => {
    expect(() => parseFirstJsonObject('["array candidate"]', { predicate: () => true })).toThrow(
      'No valid JSON object found',
    )
  })
})

function hasMapping(value: unknown): value is { mapping: unknown } {
  const mapping = (value as { mapping?: unknown }).mapping
  return mapping != null && typeof mapping === 'object'
}
