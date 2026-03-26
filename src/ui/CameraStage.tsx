import type { AudioContextStatus } from '../engine/audio'

export interface CameraStageProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  rmsDebugRef: React.RefObject<HTMLSpanElement | null>
  isActive: boolean
  audioStatus: AudioContextStatus
  debugOverlay: boolean
}

export function CameraStage({
  containerRef,
  videoRef,
  canvasRef,
  rmsDebugRef,
  isActive,
  audioStatus,
  debugOverlay,
}: CameraStageProps) {
  return (
    <div ref={containerRef} className={`ie-stage${isActive ? ' ie-stage--active' : ''}`} aria-label="Camera stage">
      <video ref={videoRef} className="ie-video" playsInline muted aria-label="Camera feed" />
      <canvas ref={canvasRef} className="ie-canvas" aria-hidden="true" />
      {import.meta.env.DEV && debugOverlay && audioStatus === 'on' && (
        <span ref={rmsDebugRef} className="ie-debugChip" data-phase="reactive" aria-hidden="true" />
      )}
      {!isActive && <div className="ie-placeholder" aria-hidden="true">Take your time. Begin when you feel ready.</div>}
    </div>
  )
}
