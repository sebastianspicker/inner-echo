import { describe, expect, it, vi } from 'vitest'

import { createStartupCleanup } from '../../src/runtime/visual/overlay/startupCleanup'

describe('WebGL startup cleanup', () => {
  it('restores pixel-store defaults and disposes partially created resources once in reverse order', () => {
    const pixelStorei = vi.fn()
    const context = {
      UNPACK_FLIP_Y_WEBGL: 1,
      UNPACK_PREMULTIPLY_ALPHA_WEBGL: 2,
      pixelStorei,
    } as unknown as WebGLRenderingContext
    const events: string[] = []
    const cleanup = createStartupCleanup(
      [() => events.push('renderer'), () => events.push('texture'), () => events.push('node')],
      () => context,
    )

    cleanup()
    cleanup()

    expect(pixelStorei).toHaveBeenCalledWith(1, false)
    expect(pixelStorei).toHaveBeenCalledWith(2, false)
    expect(events).toEqual(['node', 'texture', 'renderer'])
  })
})
