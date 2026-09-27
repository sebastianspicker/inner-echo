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
import { useDebugDiagnostics } from './useDebugDiagnostics'
import { DebugMetricsGrid } from './DebugMetricsGrid'
import {
  formatDiagnosticsJson,
  formatDiagnosticsText,
  type DebugDiagnosticsSources,
} from './diagnosticsFormatting'
import './DebugPanel.css'

export type { AppliedClampSnapshot } from '../../../domain/experience/safety'

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
  const [throwTest, setThrowTest] = useState(false)
  if (throwTest) throw new Error('Test error from Debug Panel')
  const { overlay, audioMetrics, videoMetrics, audioDebug, appliedClamps } =
    useDebugDiagnostics(props)
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
      <DebugMetricsGrid
        {...props}
        overlay={overlay}
        audioMetrics={audioMetrics}
        videoMetrics={videoMetrics}
        audioDebug={audioDebug}
        appliedClamps={appliedClamps}
      />
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
