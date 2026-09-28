/** Clears the visible camera stage canvases when Stop Everything returns the UI to idle. */
import type { StageElements } from './types'

function clearPrimaryCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) return
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  if (gl) {
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return
  }
  canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
}

function clearFallbackCanvas(canvas: HTMLCanvasElement | null): void {
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  canvas.hidden = true
}

export function clearStageCanvases(stage: StageElements | null): void {
  clearPrimaryCanvas(stage?.canvas ?? null)
  clearFallbackCanvas(stage?.fallbackCanvas ?? null)
}
