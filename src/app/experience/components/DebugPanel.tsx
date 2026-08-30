/**
 * Dev-only debug panel for WebGL/Audio status and diagnostics.
 * Renders only when import.meta.env.DEV is true.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { copyTextToClipboard } from '../presets/clipboard'
import { logger } from '../../../platform/logger'
import { useDebugDiagnostics } from '../hooks/useDebugDiagnostics'
import {
  formatDiagnosticsJson,
  formatDiagnosticsText,
  type DebugDiagnosticsSources,
} from '../session/debugDiagnosticsFormatting'
import './DebugPanel.css'

export type { AppliedClampSnapshot } from '../session/useOverlayController'

export interface DebugPanelProps extends DebugDiagnosticsSources {}

async function copyDiagnostics(
  text: string,
  copiedTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  setCopied: Dispatch<SetStateAction<boolean>>,
  failureMessage: string,
): Promise<void> {
  try {
    const copied = await copyTextToClipboard(text)
    if (!copied) return
    setCopied(true)
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    copiedTimeoutRef.current = setTimeout(() => {
      setCopied(false)
      copiedTimeoutRef.current = null
    }, 2000)
  } catch (error) {
    if (import.meta.env?.DEV) logger.warn(failureMessage, error)
  }
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
  const [throwTest, setThrowTest] = useState(false)
  if (throwTest) throw new Error('Test error from Debug Panel')
  const { overlay, audioMetrics, videoMetrics, audioDebug, appliedClamps } = useDebugDiagnostics({
    getOverlayDiagnostics,
    getAudioMetrics,
    getVideoMetrics,
    getAudioDebugState,
    getAppliedClamps,
  })
  const [copied, setCopied] = useState(false)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    void copyDiagnostics(text, copiedTimeoutRef, setCopied, 'Debug copy failed')
  }, [props, overlay])

  const handleCopyJson = useCallback(() => {
    const text = formatDiagnosticsJson(props, overlay)
    void copyDiagnostics(text, copiedTimeoutRef, setCopied, 'Debug JSON copy failed')
  }, [props, overlay])

  if (!import.meta.env.DEV) return null

  return (
    <section className="debug-panel" aria-label="Debug panel (development only)">
      <div className="debug-panel__title">Debug (dev only)</div>
      <dl className="debug-panel__grid">
        <dt>renderer</dt>
        <dd>{overlay?.rendererMode ?? '-'}</dd>
        <dt>fps</dt>
        <dd>{overlay?.fps != null ? overlay.fps.toFixed(1) : '-'}</dd>
        <dt>frame ms</dt>
        <dd>{overlay?.frameTimeMs != null ? overlay.frameTimeMs.toFixed(2) : '-'}</dd>
        <dt>renderScale</dt>
        <dd>{overlay?.renderScale ?? '-'}</dd>
        <dt>RTs</dt>
        <dd>{overlay?.resourceCounts?.renderTargets ?? '-'}</dd>
        <dt>FBOs</dt>
        <dd>{overlay?.resourceCounts?.estimatedFramebuffers ?? '-'}</dd>
        <dt>textures</dt>
        <dd>{overlay?.resourceCounts?.estimatedTextures ?? '-'}</dd>
        <dt>audio</dt>
        <dd>{audioStatus}</dd>
        <dt>mic</dt>
        <dd>{micStatus}</dd>
        <dt>video nodes</dt>
        <dd>{overlay?.activeVideoNodes?.join(', ') || '-'}</dd>
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
            {typeof audioMetrics.micCentroid === 'number' && (
              <>
                <dt>micCentroid</dt>
                <dd>{audioMetrics.micCentroid.toFixed(3)}</dd>
              </>
            )}
            {typeof audioMetrics.micFlux === 'number' && (
              <>
                <dt>micFlux</dt>
                <dd>{audioMetrics.micFlux.toFixed(3)}</dd>
              </>
            )}
          </>
        )}
        {audioDebug && (
          <>
            <dt>audio nodes</dt>
            <dd>{audioDebug.activeNodes.join(', ') || '-'}</dd>
            <dt>input mode</dt>
            <dd>{audioDebug.inputMode}</dd>
            <dt>gate gain</dt>
            <dd>{audioDebug.micGateGain != null ? audioDebug.micGateGain.toFixed(3) : '-'}</dd>
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
              {appliedClamps.intensityInput.toFixed(2)} →{' '}
              {appliedClamps.intensityEffective.toFixed(2)}
            </dd>
            <dt>safe mode keys</dt>
            <dd>{appliedClamps.safeModeClampKeys.join(', ') || '-'}</dd>
            <dt>rm disabled</dt>
            <dd>{appliedClamps.reducedMotionDisabledNodes.join(', ') || '-'}</dd>
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
          onClick={() => setThrowTest(true)}
          className="debug-panel__btn"
          aria-label="Throw test error to verify ErrorBoundary"
        >
          Throw test error
        </button>
      </div>
    </section>
  )
}
