import { afterEach, describe, expect, it, vi } from 'vitest'

import { createVideoMetricsTracker } from '../../src/runtime/visual/overlay/videoMetrics'

type CanvasStub = {
  canvas: HTMLCanvasElement
  getImageData: ReturnType<typeof vi.fn>
  setFrame(luminance: number): void
}

const originalDocument = globalThis.document

afterEach(() => {
  if (originalDocument) Object.defineProperty(globalThis, 'document', { value: originalDocument })
  else Reflect.deleteProperty(globalThis, 'document')
})

function installCanvas(): CanvasStub {
  const data = new Uint8ClampedArray(16 * 16 * 4)
  const getImageData = vi.fn(() => ({ data }))
  const context = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData,
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
  } as unknown as HTMLCanvasElement
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: vi.fn(() => canvas) },
  })
  return {
    canvas,
    getImageData,
    setFrame(luminance): void {
      const channel = Math.round(luminance * 255)
      for (let index = 0; index < data.length; index += 4) {
        data[index] = channel
        data[index + 1] = channel
        data[index + 2] = channel
        data[index + 3] = 255
      }
    },
  }
}

describe('video metrics tracker', () => {
  it('samples on its configured cadence, smooths releases, and releases canvas resources on dispose', () => {
    const stub = installCanvas()
    stub.setFrame(1)
    const tracker = createVideoMetricsTracker({ size: 16, everyN: 2, attack: 0, release: 1 })
    const source = {} as CanvasImageSource

    expect(tracker.stepFromSource(source, 0.5)).toEqual({
      motion: 0,
      luminance: 0,
      edge: 0,
      instability: 0,
    })
    const firstSample = { ...tracker.stepFromSource(source, 0.5) }
    expect(stub.getImageData).toHaveBeenCalledOnce()
    expect(firstSample.luminance).toBeCloseTo(1)
    expect(firstSample.motion).toBeCloseTo(1)

    stub.setFrame(0)
    expect(tracker.stepFromSource(source, 0.5).luminance).toBeCloseTo(1)
    const releasedSample = { ...tracker.stepFromSource(source, 0.5) }
    expect(stub.getImageData).toHaveBeenCalledTimes(2)
    expect(releasedSample.luminance).toBeGreaterThan(0)
    expect(releasedSample.luminance).toBeLessThan(1)

    tracker.dispose()
    tracker.stepFromSource(source, 0.5)
    expect(stub.canvas.width).toBe(0)
    expect(stub.canvas.height).toBe(0)
    expect(stub.getImageData).toHaveBeenCalledTimes(2)
  })

  it('seeds the next sample without reporting motion across a sampling pause', () => {
    const stub = installCanvas()
    const tracker = createVideoMetricsTracker({ size: 16, everyN: 2, attack: 0, release: 0 })
    const source = {} as CanvasImageSource
    stub.setFrame(1)
    tracker.stepFromSource(source, 0.1)
    expect(tracker.stepFromSource(source, 0.1).motion).toBe(1)

    tracker.resetTemporalHistory()
    stub.setFrame(0)
    const resumed = { ...tracker.stepFromSource(source, 0.1) }
    expect(resumed.motion).toBe(0)
    expect(resumed.instability).toBe(0)
    expect(stub.getImageData).toHaveBeenCalledTimes(2)

    stub.setFrame(1)
    tracker.stepFromSource(source, 0.1)
    expect(tracker.stepFromSource(source, 0.1).motion).toBe(1)
  })
})
