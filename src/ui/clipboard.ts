export interface ClipboardWriter {
  writeText(text: string): Promise<void>
}

function getBrowserClipboard(): ClipboardWriter | null {
  if (typeof navigator === 'undefined') return null
  const clipboard = navigator.clipboard as ClipboardWriter | undefined
  if (!clipboard || typeof clipboard.writeText !== 'function') return null
  return clipboard
}

/**
 * Best-effort clipboard write that never throws.
 * Returns true on success, false when clipboard is unavailable or write failed.
 */
export async function copyTextToClipboard(
  text: string,
  clipboardOverride?: ClipboardWriter | null
): Promise<boolean> {
  const clipboard = clipboardOverride ?? getBrowserClipboard()
  if (!clipboard) return false
  try {
    await clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

