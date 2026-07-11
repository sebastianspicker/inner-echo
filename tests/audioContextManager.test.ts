import { afterEach, describe, expect, it, vi } from 'vitest'

class TestAudioContext {
  static instances: TestAudioContext[] = []

  state: AudioContextState = 'suspended'

  constructor() {
    TestAudioContext.instances.push(this)
  }

  async resume(): Promise<void> {
    this.state = 'running'
  }

  async suspend(): Promise<void> {
    this.state = 'suspended'
  }

  async close(): Promise<void> {
    this.state = 'closed'
  }
}

describe('engine/audio/contextManager constructor selection', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
    TestAudioContext.instances = []
  })

  it('uses webkitAudioContext when the standard constructor is absent', async () => {
    vi.stubGlobal('window', {
      AudioContext: undefined,
      webkitAudioContext: TestAudioContext,
    })
    const manager = await import('../src/engine/audio/contextManager')

    await expect(manager.startAudioContext()).resolves.toBe('on')
    expect(TestAudioContext.instances).toHaveLength(1)
    await manager.closeAudioContext()
  })

  it('reports an explicit unavailable error when neither constructor exists', async () => {
    vi.stubGlobal('window', { AudioContext: undefined, webkitAudioContext: undefined })
    const manager = await import('../src/engine/audio/contextManager')
    const listener = vi.fn()
    manager.addAudioContextListener(listener)

    await expect(manager.startAudioContext()).resolves.toBe('error')
    expect(listener).toHaveBeenLastCalledWith('error', 'Web Audio is unavailable in this browser.')
    expect(manager.getAudioContext()).toBeNull()
  })
})
