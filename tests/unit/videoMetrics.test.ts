import { afterEach, describe, expect, it, vi } from 'vitest'
import { createVideoMetricsTracker } from '../../src/engine/canvas/videoMetrics'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('video metrics tracker', () => {
  it('returns a stable zero tracker without a document', () => {
    vi.stubGlobal('document', undefined)
    const tracker = createVideoMetricsTracker()

    expect(tracker.stepFromSource({} as CanvasImageSource, 1 / 60)).toEqual({
      motion: 0,
      luminance: 0,
      edge: 0,
      instability: 0,
    })
    expect(tracker.getLast()).toEqual({ motion: 0, luminance: 0, edge: 0, instability: 0 })
    expect(() => tracker.dispose()).not.toThrow()
  })

  it('samples at the configured cadence and releases the offscreen canvas', () => {
    const pixels = new Uint8ClampedArray(16 * 16 * 4).fill(255)
    const context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: pixels })),
    }
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
    }
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) })
    const tracker = createVideoMetricsTracker({ size: 8, everyN: 2, attack: 0, release: 0 })

    expect(tracker.stepFromSource({} as CanvasImageSource, 1 / 60).luminance).toBe(0)
    const measured = tracker.stepFromSource({} as CanvasImageSource, 1 / 60)
    expect(measured).toMatchObject({
      motion: 1,
      edge: 0,
      instability: 0,
    })
    expect(measured.luminance).toBeCloseTo(1)
    expect(canvas.width).toBe(16)
    expect(canvas.height).toBe(16)
    expect(context.drawImage).toHaveBeenCalledOnce()

    tracker.dispose()
    expect(canvas.width).toBe(0)
    expect(canvas.height).toBe(0)
  })
})
