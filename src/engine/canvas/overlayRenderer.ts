/**
 * Canvas 2D Overlay Renderer (Fallback)
 *
 * This module represents a simple 2D canvas renderer. It is primarily used as a fallback
 * or a baseline utility to draw the raw HTML `<video>` element feed directly onto a `<canvas>`
 * with CSS `object-fit: cover` logic applied in JavaScript.
 *
 * In standard operation, the application uses `webglPipeline.ts` instead for complex shader effects.
 */

import { syncCanvasToContainer } from './canvasSizing'

export { syncCanvasToContainer } from './canvasSizing'

/**
 * Draw the video into the 2D context with cover semantics (match CSS object-fit: cover).
 * Centers and scales the video to fill the given width/height, cropping if needed.
 */
function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
): void {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (vw <= 0 || vh <= 0) return

  const scale = Math.max(width / vw, height / vh)
  const sw = vw * scale
  const sh = vh * scale
  const sx = (width - sw) / 2
  const sy = (height - sh) / 2

  ctx.drawImage(video, 0, 0, vw, vh, sx, sy, sw, sh)
}

/**
 * Start the overlay render loop: each frame syncs canvas to container, clears, and draws the video.
 * Loop runs only while camera is active; call the returned stop() when stopping the camera.
 *
 * @param video - The source video element (camera stream).
 * @param canvas - The overlay canvas (2D).
 * @param container - The wrapper element (video and canvas parent); used for dimensions.
 * @returns Stop function. Call it when camera goes idle to cancel the loop and avoid CPU usage.
 */
export function startOverlayLoop(
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement | null,
  container: HTMLElement | null,
): (() => void) | null {
  if (!video || !canvas || !container) return null

  const maybeCtx = canvas.getContext('2d')
  if (!maybeCtx) return null
  // Bind to a new const so TypeScript narrows the type inside the closure.
  const ctx: CanvasRenderingContext2D = maybeCtx
  const overlayCanvas: HTMLCanvasElement = canvas
  const overlayVideo: HTMLVideoElement = video
  const overlayContainer: HTMLElement = container

  let rafId: number | null = null
  let stopped = false

  function loop(): void {
    if (stopped) return
    rafId = null

    syncCanvasToContainer(overlayCanvas, overlayContainer)
    const w = overlayCanvas.width
    const h = overlayCanvas.height
    if (w <= 0 || h <= 0) {
      rafId = requestAnimationFrame(loop)
      return
    }

    drawOverlayFrame(ctx, overlayVideo, w, h)

    rafId = requestAnimationFrame(loop)
  }

  rafId = requestAnimationFrame(loop)

  return function stop(): void {
    stopped = true
    if (rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }
}

function drawOverlayFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height)
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    drawVideoCover(ctx, video, width, height)
  }
}
