import { describe, expect, it } from 'vitest'

import { parseFirstJsonObject } from '../src/utils/jsonObjectParser'

describe('utils/jsonObjectParser', () => {
  it('parses a clean JSON object directly', () => {
    const value = parseFirstJsonObject<{ mapping: Record<string, unknown> }>(
      '{"mapping":{"a":1}}',
      {
        predicate(v) {
          const mapping = (v as { mapping?: unknown }).mapping
          return mapping != null && typeof mapping === 'object'
        },
      }
    )
    expect(value.mapping).toEqual({ a: 1 })
  })

  it('skips earlier object candidates that do not satisfy predicate', () => {
    const text = [
      'prefix text',
      '{"note":"not-the-object"}',
      '{"mapping":{"ok":true}}',
    ].join('\n')

    const value = parseFirstJsonObject<{ mapping: { ok: boolean } }>(text, {
      predicate(v) {
        const mapping = (v as { mapping?: unknown }).mapping
        return mapping != null && typeof mapping === 'object'
      },
    })

    expect(value.mapping.ok).toBe(true)
  })
})

