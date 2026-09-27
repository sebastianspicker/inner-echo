import { useRef } from 'react'

/** Stage DOM refs; the session module owns the media, audio, and overlay lifecycle. */
export function useWorkspaceRefs() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rmsDebugRef = useRef<HTMLSpanElement | null>(null)
  return { videoRef, containerRef, canvasRef, fallbackCanvasRef, rmsDebugRef }
}

export type WorkspaceRefs = ReturnType<typeof useWorkspaceRefs>
