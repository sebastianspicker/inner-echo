import { decodePresetPayload, encodePresetPayload, type PresetPayload } from './presetSnapshot'

const HASH_PREFIX = '#preset='
const MAX_HASH_PAYLOAD_LENGTH = 8192

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const withPadding = padded + '='.repeat((4 - (padded.length % 4 || 4)) % 4)
  const binary = atob(withPadding)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodePresetToHash(payload: PresetPayload): string {
  const serialized = encodePresetPayload(payload)
  return `${HASH_PREFIX}${toBase64Url(serialized)}`
}

export function decodePresetFromHash(
  hash: string,
): { ok: true; payload: PresetPayload } | { ok: false; reason: string } {
  if (!hash.startsWith(HASH_PREFIX)) {
    return { ok: false, reason: 'missing-prefix' }
  }
  if (hash.length > MAX_HASH_PAYLOAD_LENGTH) {
    return { ok: false, reason: 'payload-too-large' }
  }
  const token = hash.slice(HASH_PREFIX.length).trim()
  if (!token) return { ok: false, reason: 'empty' }
  try {
    const serialized = fromBase64Url(token)
    const payload = decodePresetPayload(serialized)
    if (!payload) return { ok: false, reason: 'invalid-payload' }
    return { ok: true, payload }
  } catch {
    return { ok: false, reason: 'decode-failed' }
  }
}
