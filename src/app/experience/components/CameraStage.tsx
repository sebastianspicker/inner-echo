import type { AudioContextStatus } from '../../../runtime/audio'
import type { CameraState } from '../../../runtime/camera'
import type { OverlayRendererMode } from '../../../runtime/visual/overlay'

const DEBUG_UI_ENABLED = import.meta.env.DEV && import.meta.env.VITE_INNER_ECHO_DEBUG_UI === 'true'

export interface CameraStageProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
  webglCanvasRef: React.RefObject<HTMLCanvasElement | null>
  fallbackCanvasRef: React.RefObject<HTMLCanvasElement | null>
  rmsDebugRef: React.RefObject<HTMLSpanElement | null>
  isActive: boolean
  cameraState: CameraState
  audioStatus: AudioContextStatus
  rendererMode: OverlayRendererMode
  effectsActive: boolean
  debugOverlay: boolean
}

function getStageReadout(
  cameraState: CameraState,
  rendererMode: OverlayRendererMode,
  effectsActive: boolean,
): string {
  if (cameraState === 'requesting') return 'Requesting camera'
  if (cameraState !== 'active') return 'Preview idle'
  if (effectsActive) return 'Effects active'
  if (rendererMode === 'webgl') return 'Clean preview'
  if (rendererMode === '2d' || rendererMode === 'raw') return 'Raw preview'
  return 'Renderer unavailable'
}

export function CameraStage({
  containerRef,
  videoRef,
  webglCanvasRef,
  fallbackCanvasRef,
  rmsDebugRef,
  isActive,
  cameraState,
  audioStatus,
  rendererMode,
  effectsActive,
  debugOverlay,
}: CameraStageProps) {
  const stageReadout = getStageReadout(cameraState, rendererMode, effectsActive)

  return (
    <section
      ref={containerRef}
      className={`ie-stage${isActive ? ' ie-stage--active' : ''}`}
      aria-label="Camera stage"
    >
      <video ref={videoRef} className="ie-video" playsInline muted aria-label="Camera feed" />
      <canvas ref={webglCanvasRef} className="ie-canvas" />
      <canvas ref={fallbackCanvasRef} className="ie-canvas" hidden />
      {isActive && (
        <div className="ie-stageChrome">
          <div className="ie-stageTruth">
            <span className="ie-statusDot is-active" aria-hidden="true" />
            {stageReadout}
          </div>
        </div>
      )}
      {DEBUG_UI_ENABLED && debugOverlay && audioStatus === 'on' && (
        <span ref={rmsDebugRef} className="ie-debugChip" data-phase="reactive" aria-hidden="true" />
      )}
      {!isActive && (
        <div className="ie-placeholder">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              d="M3 3l18 18M4 7H3v12h14v-3M8 7h9v5l4-3v9l-4-3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p>
            {cameraState === 'requesting'
              ? 'Waiting for camera permission…'
              : 'Your preview stays off until you start it.'}
          </p>
          <span>Camera and sound are optional.</span>
        </div>
      )}
    </section>
  )
}
