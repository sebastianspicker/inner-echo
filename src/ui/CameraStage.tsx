import type { AudioContextStatus } from '../engine/audio'
import brandMarkUrl from '../../assets/brand/inner-echo-mark.svg'

export interface CameraStageProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
  webglCanvasRef: React.RefObject<HTMLCanvasElement | null>
  fallbackCanvasRef: React.RefObject<HTMLCanvasElement | null>
  rmsDebugRef: React.RefObject<HTMLSpanElement | null>
  isActive: boolean
  audioStatus: AudioContextStatus
  debugOverlay: boolean
}

export function CameraStage({
  containerRef,
  videoRef,
  webglCanvasRef,
  fallbackCanvasRef,
  rmsDebugRef,
  isActive,
  audioStatus,
  debugOverlay,
}: CameraStageProps) {
  return (
    <div
      ref={containerRef}
      className={`ie-stage${isActive ? ' ie-stage--active' : ''}`}
      aria-label="Camera stage"
    >
      <video ref={videoRef} className="ie-video" playsInline muted aria-label="Camera feed" />
      <canvas ref={webglCanvasRef} className="ie-canvas" aria-hidden="true" />
      <canvas ref={fallbackCanvasRef} className="ie-canvas" aria-hidden="true" hidden />
      {isActive && (
        <div className="ie-stageChrome" aria-hidden="true">
          <div className="ie-stageMeta">
            <span>Experience / Custom</span>
            <span>Processed locally</span>
          </div>
          <div className="ie-stageCaption">A metaphor, not a measurement.</div>
        </div>
      )}
      {import.meta.env.DEV && debugOverlay && audioStatus === 'on' && (
        <span ref={rmsDebugRef} className="ie-debugChip" data-phase="reactive" aria-hidden="true" />
      )}
      {!isActive && (
        <div className="ie-placeholder" aria-hidden="true">
          <img className="ie-placeholderMark" src={brandMarkUrl} alt="" />
          <span>Camera is off. Review setup and comfort controls before starting.</span>
        </div>
      )}
    </div>
  )
}
