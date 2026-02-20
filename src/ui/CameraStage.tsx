import type { AudioContextStatus } from '../engine/audio'

export interface CameraStageProps {
    containerRef: React.RefObject<HTMLDivElement>
    videoRef: React.RefObject<HTMLVideoElement>
    canvasRef: React.RefObject<HTMLCanvasElement>
    rmsDebugRef: React.RefObject<HTMLSpanElement>
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
        <div ref={containerRef} className="ie-stage" aria-label="Camera stage">
            <video ref={videoRef} className="ie-video" playsInline muted aria-label="Camera feed" />
            <canvas ref={canvasRef} className="ie-canvas" aria-hidden="true" />
            {import.meta.env.DEV && debugOverlay && audioStatus === 'on' && (
                <span ref={rmsDebugRef} className="ie-debugChip" data-phase="reactive" aria-hidden="true" />
            )}
            {!isActive && <div className="ie-placeholder" aria-hidden="true">No image</div>}
        </div>
    )
}
