/**
 * Audio Context Manager
 *
 * This module acts as a global singleton manager for the Web Audio API's `AudioContext`.
 * Modern browsers have strict autoplay policies for audio: an `AudioContext` cannot
 * play sound until the user has explicitly interacted with the page (e.g., clicking a button).
 *
 * To handle this gracefully:
 * 1. The `sharedContext` is only instantiated after a user gesture calls `startAudioContext()`.
 * 2. It tracks the current lifecycle state (off, starting, on, error) and broadcasts changes
 *    to listeners (like the UI).
 * 3. It provides a polyfill (`webkitAudioContext`) for older Safari versions.
 */

import type { AudioContextStatus } from './types'
import { logger } from '../../utils/logger'

export type AudioContextManagerListener = (status: AudioContextStatus, error?: string) => void

// The global (singleton) AudioContext instance for the entire application.
// Keeping a singleton ensures we don't hit browser limits for maximum concurrent contexts.
let sharedContext: AudioContext | null = null

// Tracks if an asynchronous close operation is currently in progress.
let closingPromise: Promise<void> | null = null

// Tracks if an asynchronous start operation is currently in progress.
let startingPromise: Promise<AudioContextStatus> | null = null

// A set of callback functions (listeners) that want to be updated when the audio status changes.
const listeners = new Set<AudioContextManagerListener>()

// Tracks the last notified status to avoid duplicate notifications (e.g. double 'off').
let lastNotifiedStatus: AudioContextStatus | null = null

/**
 * Helper function to broadcast the current status to all registered UI components.
 */
function notify(status: AudioContextStatus, error?: string): void {
  if (status === lastNotifiedStatus && status === 'off') return
  lastNotifiedStatus = status
  listeners.forEach((fn) => fn(status, error))
}

/**
 * Initializes or resumes the global `AudioContext`.
 *
 * **IMPORTANT:** This function MUST be triggered by a direct user interaction event
 * (e.g., an `onClick` handler on a "Start" button) to comply with browser autoplay policies.
 *
 * @returns A promise resolving to the new `AudioContextStatus`.
 */
export async function startAudioContext(): Promise<AudioContextStatus> {
  if (startingPromise) return startingPromise

  startingPromise = (async () => {
    notify('starting')
    try {
      // Wait for any pending shutdown to finish before trying to start again.
      if (closingPromise) {
        await closingPromise
      }

      // If we don't have a context yet, or the previous one was permenantly closed, create a new one.
      if (!sharedContext || sharedContext.state === 'closed') {
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (typeof AudioCtx !== 'function') {
          const message = 'Web Audio is unavailable in this browser.'
          notify('error', message)
          return 'error' as const
        }
        sharedContext = new AudioCtx()
      }

      if (sharedContext.state !== 'running') {
        await sharedContext.resume()
      }

      if (sharedContext.state === 'running') {
        notify('on')
        return 'on' as const
      }

      let errorType = 'Failed to start audio.'
      if (sharedContext.state === 'suspended') {
        errorType =
          'Audio blocked by browser. Please interact with the page (click or tap) and try again.'
      }

      const message = `${errorType} (Current state: ${sharedContext.state})`
      notify('error', message)
      return 'error' as const
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : String(e)
      let userMessage = `Audio initialization failed: ${rawMessage}`

      if (rawMessage.includes('hardware') || rawMessage.includes('device')) {
        userMessage = 'Audio hardware error. Please check your output device and try again.'
      }

      notify('error', userMessage)
      return 'error' as const
    }
  })().finally(() => {
    startingPromise = null
  })

  return startingPromise
}

/**
 * Pauses the audio processing.
 *
 * Suspending the context stops the hardware from processing audio, which saves CPU battery,
 * but keeps the internal audio graph intact so it can be resumed instantly later.
 * Use this when the user clicks "Stop" or hides the application.
 */
export async function suspendAudioContext(): Promise<void> {
  if (closingPromise) {
    await closingPromise
    notify('off')
    return
  }
  if (sharedContext) {
    try {
      await sharedContext.suspend()
      notify('off')
    } catch (err) {
      logger.warn('suspendAudioContext failed', err)
      notify('off')
    }
  } else {
    notify('off')
  }
}

/**
 * Retrieves the currently active `AudioContext` singleton.
 *
 * Modules that need to build an audio graph (like synthesizers or microphone inputs)
 * will call this to attach their nodes. It returns `null` if audio hasn't been started yet.
 */
export function getAudioContext(): AudioContext | null {
  return sharedContext
}

/**
 * Subscribes a listener to context status changes (e.g., connected, suspended, error).
 *
 * @param fn The callback function.
 * @returns A cleanup function to remove the listener later (useful for React `useEffect` cleanup).
 */
export function addAudioContextListener(fn: AudioContextManagerListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Fully destroys the `AudioContext` and releases system audio resources.
 *
 * Unlike `suspendAudioContext`, this permanently shuts down the graph. A completely
 * new `AudioContext` will need to be instantiated (requiring a new user gesture) to play audio again.
 * Used during complete application teardown.
 */
export async function closeAudioContext(): Promise<void> {
  if (!sharedContext) {
    notify('off')
    return
  }
  if (closingPromise) {
    await closingPromise
    return
  }
  const ctx = sharedContext
  closingPromise = (async () => {
    try {
      // Safari may hang on ctx.close(); use a timeout to avoid blocking indefinitely.
      await Promise.race([ctx.close(), new Promise<void>((resolve) => setTimeout(resolve, 2000))])
    } catch (err) {
      logger.warn('AudioContext.close() failed', err)
    } finally {
      if (sharedContext === ctx) sharedContext = null
      notify('off')
      closingPromise = null
    }
  })()
  await closingPromise
}
