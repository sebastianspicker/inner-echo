/**
 * Phase 12: Dev-only debug panel for WebGL/Audio status and diagnostics.
 * Renders only when import.meta.env.DEV is true.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { OverlayDiagnostics } from '../engine/canvas'
import type { AudioContextStatus } from '../engine/audio'
import type { MicStatus } from '../engine/audio'
import type { AudioMetrics } from '../engine/audio'
import type { AudioEngineDebugState } from '../engine/audio'
import type { VideoMetrics } from '../engine/canvas'
import { copyTextToClipboard } from './clipboard'
import { logger } from '../utils/logger'
import './DebugPanel.css'

export interface AppliedClampSnapshot {
  intensityInput: number
  intensityEffective: number
  safeMode: boolean
  reducedMotion: boolean
  safeModeClampKeys: string[]
  reducedMotionDisabledNodes: string[]
}

export interface DebugPanelProps {
  /** Returns current overlay diagnostics when overlay is active; undefined otherwise. */
  getOverlayDiagnostics: () => OverlayDiagnostics | undefined
  audioStatus: AudioContextStatus
  micStatus: MicStatus
  /** Last user-facing error (camera, audio, or mic). Not sensitive data. */
  lastError?: string | null

  /** Optional: pull current audio metrics (post-chain; may include mic fields). */
  getAudioMetrics?: () => AudioMetrics | undefined
  /** Optional: pull current video metrics (computed from rendered canvas). */
  getVideoMetrics?: () => VideoMetrics | undefined
  /** Optional: pull current audio debug metadata (active nodes, gate state). */
  getAudioDebugState?: () => AudioEngineDebugState | undefined
  /** Optional: pull currently applied clamps (safe mode + reduced motion). */
  getAppliedClamps?: () => AppliedClampSnapshot | undefined

  couplingStrength?: number
  maxFeedback?: number
  micSensitivity?: number
  micGate?: number
}

function formatDiagnosticsText(props: DebugPanelProps, overlay: OverlayDiagnostics | undefined): string {
  const audioMetrics = props.getAudioMetrics?.()
  const videoMetrics = props.getVideoMetrics?.()
  const audioDebug = props.getAudioDebugState?.()
  const appliedClamps = props.getAppliedClamps?.()
  const lines: string[] = [
    `Inner Echo diagnostics — ${new Date().toISOString()}`,
    '---',
    `renderer: ${overlay?.rendererMode ?? 'none'}`,
    `fps: ${overlay?.fps != null ? overlay.fps.toFixed(1) : 'n/a'}`,
    `frameTimeMs: ${overlay?.frameTimeMs != null ? overlay.frameTimeMs.toFixed(2) : 'n/a'}`,
    `renderScale: ${overlay?.renderScale ?? 'n/a'}`,
    `resources.renderTargets: ${overlay?.resourceCounts?.renderTargets ?? 'n/a'}`,
    `resources.temporalPairs: ${overlay?.resourceCounts?.temporalPairs ?? 'n/a'}`,
    `resources.estimatedTextures: ${overlay?.resourceCounts?.estimatedTextures ?? 'n/a'}`,
    `resources.estimatedFramebuffers: ${overlay?.resourceCounts?.estimatedFramebuffers ?? 'n/a'}`,
    `video.activeNodes: ${(overlay?.activeVideoNodes ?? []).join(', ') || 'n/a'}`,
    `audio: ${props.audioStatus}`,
    `mic: ${props.micStatus}`,
    `couplingStrength: ${props.couplingStrength ?? 'n/a'}`,
    `maxFeedback: ${props.maxFeedback ?? 'n/a'}`,
  ]
  if (audioMetrics) {
    lines.push(`audio.rms: ${audioMetrics.rms.toFixed(3)}`)
    lines.push(`audio.centroid: ${audioMetrics.centroid.toFixed(3)}`)
    lines.push(`audio.flux: ${audioMetrics.flux.toFixed(3)}`)
    if (typeof audioMetrics.micRms === 'number') lines.push(`mic.rms: ${audioMetrics.micRms.toFixed(3)}`)
    if (typeof audioMetrics.micCentroid === 'number') lines.push(`mic.centroid: ${audioMetrics.micCentroid.toFixed(3)}`)
    if (typeof audioMetrics.micFlux === 'number') lines.push(`mic.flux: ${audioMetrics.micFlux.toFixed(3)}`)
  }
  if (videoMetrics) {
    lines.push(`video.motion: ${videoMetrics.motion.toFixed(3)}`)
    lines.push(`video.luminance: ${videoMetrics.luminance.toFixed(3)}`)
    lines.push(`video.edge: ${videoMetrics.edge.toFixed(3)}`)
    lines.push(`video.instability: ${videoMetrics.instability.toFixed(3)}`)
  }
  if (audioDebug) {
    lines.push(`audio.activeNodes: ${audioDebug.activeNodes.join(', ') || 'n/a'}`)
    lines.push(`audio.inputMode: ${audioDebug.inputMode}`)
    lines.push(`audio.micEnabled: ${audioDebug.micEnabled ? 'yes' : 'no'}`)
    lines.push(`audio.micGateGain: ${audioDebug.micGateGain != null ? audioDebug.micGateGain.toFixed(3) : 'n/a'}`)
  }
  if (appliedClamps) {
    lines.push(
      `clamps.intensity: ${appliedClamps.intensityInput.toFixed(3)} -> ${appliedClamps.intensityEffective.toFixed(3)}`
    )
    lines.push(`clamps.safeMode: ${appliedClamps.safeMode ? 'on' : 'off'}`)
    lines.push(`clamps.reducedMotion: ${appliedClamps.reducedMotion ? 'on' : 'off'}`)
    lines.push(`clamps.safeModeKeys: ${appliedClamps.safeModeClampKeys.join(', ') || 'none'}`)
    lines.push(
      `clamps.reducedMotionDisabledNodes: ${appliedClamps.reducedMotionDisabledNodes.join(', ') || 'none'}`
    )
  }
  if (props.lastError) {
    lines.push(`lastError: ${props.lastError}`)
  }
  return lines.join('\n')
}

function formatDiagnosticsJson(props: DebugPanelProps, overlay: OverlayDiagnostics | undefined): string {
  return JSON.stringify(
    {
      ts: new Date().toISOString(),
      overlay,
      audioStatus: props.audioStatus,
      micStatus: props.micStatus,
      couplingStrength: props.couplingStrength,
      maxFeedback: props.maxFeedback,
      lastError: props.lastError ?? null,
      audioMetrics: props.getAudioMetrics?.() ?? null,
      videoMetrics: props.getVideoMetrics?.() ?? null,
      audioDebug: props.getAudioDebugState?.() ?? null,
      appliedClamps: props.getAppliedClamps?.() ?? null,
    },
    null,
    2
  )
}

export function DebugPanel(props: DebugPanelProps) {
  const {
    getOverlayDiagnostics,
    audioStatus,
    micStatus,
    lastError,
    getAudioMetrics,
    getVideoMetrics,
    getAudioDebugState,
    getAppliedClamps,
  } = props
  const [overlay, setOverlay] = useState<OverlayDiagnostics | undefined>(() => getOverlayDiagnostics())
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics | undefined>(() => getAudioMetrics?.())
  const [videoMetrics, setVideoMetrics] = useState<VideoMetrics | undefined>(() => getVideoMetrics?.())
  const [audioDebug, setAudioDebug] = useState<AudioEngineDebugState | undefined>(() => getAudioDebugState?.())
  const [appliedClamps, setAppliedClamps] = useState<AppliedClampSnapshot | undefined>(() => getAppliedClamps?.())
  const [copied, setCopied] = useState(false)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Poll overlay diagnostics in dev so we don't need to lift overlay ref into React state.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    let rafId: number | null = null
    function tick(): void {
      setOverlay(getOverlayDiagnostics())
      setAudioMetrics(getAudioMetrics?.())
      setVideoMetrics(getVideoMetrics?.())
      setAudioDebug(getAudioDebugState?.())
      setAppliedClamps(getAppliedClamps?.())
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [getOverlayDiagnostics, getAudioMetrics, getVideoMetrics, getAudioDebugState, getAppliedClamps])

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current)
        copiedTimeoutRef.current = null
      }
    }
  }, [])

  const handleCopy = useCallback(() => {
    const text = formatDiagnosticsText(props, overlay)
    copyTextToClipboard(text)
      .then((ok) => {
        if (!ok) return
        setCopied(true)
        if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
        copiedTimeoutRef.current = setTimeout(() => {
          setCopied(false)
          copiedTimeoutRef.current = null
        }, 2000)
      })
      .catch((err) => {
        if (import.meta.env?.DEV) logger.warn('Debug copy failed', err)
      })
  }, [props, overlay])

  const handleCopyJson = useCallback(() => {
    const text = formatDiagnosticsJson(props, overlay)
    copyTextToClipboard(text)
      .then((ok) => {
        if (!ok) return
        setCopied(true)
        if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
        copiedTimeoutRef.current = setTimeout(() => {
          setCopied(false)
          copiedTimeoutRef.current = null
        }, 2000)
      })
      .catch((err) => {
        if (import.meta.env?.DEV) logger.warn('Debug JSON copy failed', err)
      })
  }, [props, overlay])

  if (!import.meta.env.DEV) return null

  return (
    <section
      className="debug-panel"
      aria-label="Debug panel (development only)"
    >
      <div className="debug-panel__title">Debug (dev only)</div>
      <dl className="debug-panel__grid">
        <dt>renderer</dt>
        <dd>{overlay?.rendererMode ?? '—'}</dd>
        <dt>fps</dt>
        <dd>{overlay?.fps != null ? overlay.fps.toFixed(1) : '—'}</dd>
        <dt>frame ms</dt>
        <dd>{overlay?.frameTimeMs != null ? overlay.frameTimeMs.toFixed(2) : '—'}</dd>
        <dt>renderScale</dt>
        <dd>{overlay?.renderScale ?? '—'}</dd>
        <dt>RTs</dt>
        <dd>{overlay?.resourceCounts?.renderTargets ?? '—'}</dd>
        <dt>FBOs</dt>
        <dd>{overlay?.resourceCounts?.estimatedFramebuffers ?? '—'}</dd>
        <dt>textures</dt>
        <dd>{overlay?.resourceCounts?.estimatedTextures ?? '—'}</dd>
        <dt>audio</dt>
        <dd>{audioStatus}</dd>
        <dt>mic</dt>
        <dd>{micStatus}</dd>
        <dt>video nodes</dt>
        <dd>{overlay?.activeVideoNodes?.join(', ') || '—'}</dd>
        {props.couplingStrength != null && (
          <>
            <dt>coupling</dt>
            <dd>{props.couplingStrength.toFixed(2)}</dd>
          </>
        )}
        {props.maxFeedback != null && (
          <>
            <dt>maxFeedback</dt>
            <dd>{props.maxFeedback.toFixed(2)}</dd>
          </>
        )}
        {audioMetrics && (
          <>
            <dt>rms</dt>
            <dd>{audioMetrics.rms.toFixed(3)}</dd>
            <dt>centroid</dt>
            <dd>{audioMetrics.centroid.toFixed(3)}</dd>
            <dt>flux</dt>
            <dd>{audioMetrics.flux.toFixed(3)}</dd>
            {typeof audioMetrics.micRms === 'number' && (
              <>
                <dt>micRms</dt>
                <dd>{audioMetrics.micRms.toFixed(3)}</dd>
              </>
            )}
          </>
        )}
        {audioDebug && (
          <>
            <dt>audio nodes</dt>
            <dd>{audioDebug.activeNodes.join(', ') || '—'}</dd>
            <dt>input mode</dt>
            <dd>{audioDebug.inputMode}</dd>
            <dt>gate gain</dt>
            <dd>{audioDebug.micGateGain != null ? audioDebug.micGateGain.toFixed(3) : '—'}</dd>
          </>
        )}
        {videoMetrics && (
          <>
            <dt>motion</dt>
            <dd>{videoMetrics.motion.toFixed(3)}</dd>
            <dt>luma</dt>
            <dd>{videoMetrics.luminance.toFixed(3)}</dd>
            <dt>edge</dt>
            <dd>{videoMetrics.edge.toFixed(3)}</dd>
          </>
        )}
        {appliedClamps && (
          <>
            <dt>intensity</dt>
            <dd>
              {appliedClamps.intensityInput.toFixed(2)} → {appliedClamps.intensityEffective.toFixed(2)}
            </dd>
            <dt>safe mode keys</dt>
            <dd>{appliedClamps.safeModeClampKeys.join(', ') || '—'}</dd>
            <dt>rm disabled</dt>
            <dd>{appliedClamps.reducedMotionDisabledNodes.join(', ') || '—'}</dd>
          </>
        )}
        {lastError && (
          <>
            <dt>last error</dt>
            <dd className="debug-panel__error">{lastError}</dd>
          </>
        )}
      </dl>
      <div className="debug-panel__actions">
        <button
          type="button"
          onClick={handleCopy}
          className="debug-panel__btn"
          aria-label="Copy diagnostics to clipboard"
        >
          {copied ? 'Copied' : 'Copy diagnostics'}
        </button>
        <button
          type="button"
          onClick={handleCopyJson}
          className="debug-panel__btn"
          aria-label="Copy diagnostics as JSON"
        >
          Copy JSON
        </button>
        <button
          type="button"
          onClick={() => {
            throw new Error('Test error from Debug Panel (Phase 12)')
          }}
          className="debug-panel__btn"
          aria-label="Throw test error to verify ErrorBoundary"
        >
          Throw test error
        </button>
      </div>
    </section>
  )
}
