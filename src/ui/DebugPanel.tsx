/**
 * Phase 12: Dev-only debug panel for WebGL/Audio status and diagnostics.
 * Renders only when import.meta.env.DEV is true.
 */

import { useCallback, useEffect, useState } from 'react'
import type { OverlayDiagnostics } from '../engine/canvas'
import type { AudioContextStatus } from '../engine/audio'
import type { MicStatus } from '../engine/audio'
import type { AudioMetrics } from '../engine/audio'
import type { VideoMetrics } from '../engine/canvas'
import './DebugPanel.css'

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

  couplingStrength?: number
  maxFeedback?: number
  micSensitivity?: number
  micGate?: number
}

function formatDiagnosticsText(props: DebugPanelProps, overlay: OverlayDiagnostics | undefined): string {
  const audioMetrics = props.getAudioMetrics?.()
  const videoMetrics = props.getVideoMetrics?.()
  const lines: string[] = [
    `Inner Echo diagnostics — ${new Date().toISOString()}`,
    '---',
    `renderer: ${overlay?.rendererMode ?? 'none'}`,
    `fps: ${overlay?.fps != null ? overlay.fps.toFixed(1) : 'n/a'}`,
    `renderScale: ${overlay?.renderScale ?? 'n/a'}`,
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
  if (props.lastError) {
    lines.push(`lastError: ${props.lastError}`)
  }
  return lines.join('\n')
}

export function DebugPanel(props: DebugPanelProps) {
  const { getOverlayDiagnostics, audioStatus, micStatus, lastError, getAudioMetrics, getVideoMetrics } = props
  const [overlay, setOverlay] = useState<OverlayDiagnostics | undefined>(() => getOverlayDiagnostics())
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics | undefined>(() => getAudioMetrics?.())
  const [videoMetrics, setVideoMetrics] = useState<VideoMetrics | undefined>(() => getVideoMetrics?.())
  const [copied, setCopied] = useState(false)

  // Poll overlay diagnostics in dev so we don't need to lift overlay ref into React state.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    let rafId: number | null = null
    function tick(): void {
      setOverlay(getOverlayDiagnostics())
      setAudioMetrics(getAudioMetrics?.())
      setVideoMetrics(getVideoMetrics?.())
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [getOverlayDiagnostics, getAudioMetrics, getVideoMetrics])

  const handleCopy = useCallback(() => {
    const text = formatDiagnosticsText(props, overlay)
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {}
    )
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
        <dt>renderScale</dt>
        <dd>{overlay?.renderScale ?? '—'}</dd>
        <dt>audio</dt>
        <dd>{audioStatus}</dd>
        <dt>mic</dt>
        <dd>{micStatus}</dd>
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
