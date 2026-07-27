export function readLuma(data: Uint8ClampedArray, pixel: number): number {
  return (
    (0.2126 * (data[pixel] ?? 0) +
      0.7152 * (data[pixel + 1] ?? 0) +
      0.0722 * (data[pixel + 2] ?? 0)) /
    255
  )
}

export function computeEdgeEnergy(data: Uint8ClampedArray, size: number): number {
  let sumEdge = 0
  for (let y = 0; y < size; y++) sumEdge += computeEdgeRow(data, size, y)
  return sumEdge
}

function computeEdgeRow(data: Uint8ClampedArray, size: number, y: number): number {
  let sum = 0
  for (let x = 0; x < size; x++) {
    const index = y * size + x
    const luma = readLuma(data, index * 4)
    if (x + 1 < size) sum += Math.abs(readLuma(data, (index + 1) * 4) - luma)
    if (y + 1 < size) sum += Math.abs(readLuma(data, (index + size) * 4) - luma)
  }
  return sum
}
