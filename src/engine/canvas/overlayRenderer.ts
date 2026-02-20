/**
 * Canvas 2D Overlay Renderer (Fallback)
 * 
 * This module represents a simple 2D canvas renderer. It is primarily used as a fallback
 * or a baseline utility to draw the raw HTML `<video>` element feed directly onto a `<canvas>`
 * with CSS `object-fit: cover` logic applied in JavaScript.
 * 
 * In standard operation, the application uses `webglPipeline.ts` instead for complex shader effects.
 */

/**
 * Sync canvas buffer dimensions to the container's display size (pixel-perfect overlay).
 * Safe to call with null refs; no-op if container has zero size.
 */
export function syncCanvasToContainer(
  canvas: HTMLCanvasElement | null,
  container: HTMLElement | null
): void {
  if (!canvas || !container) return
  const w = container.clientWidth
  const h = container.clientHeight
  if (w <= 0 || h <= 0) return
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
}

/**
 * Draw the video into the 2D context with cover semantics (match CSS object-fit: cover).
 * Centers and scales the video to fill the given width/height, cropping if needed.
 */
function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number
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
  container: HTMLElement | null
): () => void {
  if (!video || !canvas || !container) return () => { }

  let rafId: number | null = null
  let stopped = false

  function loop(): void {
    if (stopped) return
    rafId = null

    if (!video || !canvas || !container) return

    syncCanvasToContainer(canvas, container)
    const w = canvas.width
    const h = canvas.height
    if (w <= 0 || h <= 0) {
      rafId = requestAnimationFrame(loop)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      rafId = requestAnimationFrame(loop)
      return
    }

    ctx.clearRect(0, 0, w, h)
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      drawVideoCover(ctx, video, w, h)
    }

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
