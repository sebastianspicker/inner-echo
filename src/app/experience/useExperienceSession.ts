import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'

import { createExperienceSession } from '../../runtime/session'
import type { ExperienceSession, LiveSettings, SessionSnapshot } from '../../runtime/session'
import type { WorkspaceRefs } from './hooks/workspaceRefs'

/**
 * Binds the framework-free experience session to React: creates one session per
 * component lifetime, subscribes the visible snapshot, and attaches the stage DOM
 * refs. The session itself stays reusable across a React StrictMode unmount/remount
 * pair, so only `release()` runs on cleanup.
 */
export function useExperienceSession(refs: WorkspaceRefs): {
  session: ExperienceSession
  snapshot: SessionSnapshot
} {
  const [session] = useState(() => createExperienceSession())
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot)

  useLayoutEffect(() => {
    session.attachStage({
      video: refs.videoRef.current,
      canvas: refs.canvasRef.current,
      fallbackCanvas: refs.fallbackCanvasRef.current,
      container: refs.containerRef.current,
    })
    return () => session.attachStage(null)
    // Ref objects from useRef are stable; this attaches once per mount.
  }, [session, refs.videoRef, refs.canvasRef, refs.fallbackCanvasRef, refs.containerRef])

  useEffect(() => () => session.release(), [session])

  return { session, snapshot }
}

/** Forwards the current live settings to the session; cheap and idempotent per call. */
export function useSessionLiveSettings(session: ExperienceSession, settings: LiveSettings): void {
  const { profile, reducedMotion, safeMode, intensity, stressMode, controlValues } = settings
  const { couplingStrength, maxFeedback, diagnosticsActive } = settings
  useEffect(() => {
    session.update({
      profile,
      reducedMotion,
      safeMode,
      intensity,
      stressMode,
      controlValues,
      couplingStrength,
      maxFeedback,
      diagnosticsActive,
    })
  }, [
    session,
    profile,
    reducedMotion,
    safeMode,
    intensity,
    stressMode,
    controlValues,
    couplingStrength,
    maxFeedback,
    diagnosticsActive,
  ])
}
