export function syncCanvasToContainer(
  canvas: HTMLCanvasElement | null,
  container: HTMLElement | null,
): void {
  if (!canvas || !container) return
  const width = container.clientWidth
  const height = container.clientHeight
  if (width <= 0 || height <= 0) return
  if (canvas.width === width && canvas.height === height) return
  canvas.width = width
  canvas.height = height
}
