import { describe, expect, it, vi } from 'vitest'
import { copyTextToClipboard, type ClipboardWriter } from '../src/ui/clipboard'

describe('ui/clipboard', () => {
  it('returns false when clipboard is unavailable', async () => {
    const ok = await copyTextToClipboard('hello', null)
    expect(ok).toBe(false)
  })

  it('returns true when writeText resolves', async () => {
    const clipboard: ClipboardWriter = {
      writeText: vi.fn(async () => {}),
    }
    const ok = await copyTextToClipboard('hello', clipboard)
    expect(ok).toBe(true)
    expect(clipboard.writeText).toHaveBeenCalledWith('hello')
  })

  it('returns false when writeText rejects', async () => {
    const clipboard: ClipboardWriter = {
      writeText: vi.fn(async () => {
        throw new Error('denied')
      }),
    }
    const ok = await copyTextToClipboard('hello', clipboard)
    expect(ok).toBe(false)
  })
})
