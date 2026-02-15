/**
 * Phase 7: AudioContext lifecycle. Created only after user gesture.
 * Status: off | starting | on | error.
 */

import type { AudioContextStatus } from './types'

export type AudioContextManagerListener = (status: AudioContextStatus, error?: string) => void

let sharedContext: AudioContext | null = null
const listeners = new Set<AudioContextManagerListener>()

function notify(status: AudioContextStatus, error?: string): void {
  listeners.forEach((fn) => fn(status, error))
}

/**
 * Start AudioContext (must be called from user gesture).
 * Resumes if context was suspended. Returns new status.
 */
export async function startAudioContext(): Promise<AudioContextStatus> {
  notify('starting')
  try {
    if (!sharedContext) {
      sharedContext = new AudioContext()
    }
    if (sharedContext.state === 'suspended') {
      await sharedContext.resume()
    }
    if (sharedContext.state === 'running') {
      notify('on')
      return 'on'
    }
    notify('on')
    return 'on'
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    notify('error', message)
    return 'error'
  }
}

/**
 * Suspend AudioContext (e.g. Stop Everything). Does not destroy the context so it can be resumed later.
 */
export async function suspendAudioContext(): Promise<void> {
  if (sharedContext) {
    try {
      await sharedContext.suspend()
      notify('off')
    } catch {
      notify('off')
    }
  } else {
    notify('off')
  }
}

/**
 * Get the current AudioContext. Null if never started or after explicit close.
 * Do not call before user gesture; use startAudioContext() first.
 */
export function getAudioContext(): AudioContext | null {
  return sharedContext
}

/**
 * Current status. Updated by startAudioContext / suspendAudioContext.
 */
export function addAudioContextListener(fn: AudioContextManagerListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Close and clear the context (e.g. on full teardown). After this, a new user gesture must create a new context.
 */
export async function closeAudioContext(): Promise<void> {
  if (sharedContext) {
    try {
      await sharedContext.close()
    } finally {
      sharedContext = null
      notify('off')
    }
  }
}
