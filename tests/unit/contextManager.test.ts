import { afterEach, describe, expect, it, vi } from 'vitest'

type ContextState = 'suspended' | 'running' | 'closed'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('engine/audio/contextManager lifecycle races', () => {
  it('does not defer a newer activation behind an invalidated pending start', async () => {
    const firstResume = deferred()
    const contexts: TestAudioContext[] = []

    class TestAudioContext {
      state: ContextState = 'suspended'
      readonly resume = vi.fn(async () => {
        if (contexts[0] === this) await firstResume.promise
        if (this.state !== 'closed') this.state = 'running'
      })
      readonly close = vi.fn(async () => {
        this.state = 'closed'
      })

      constructor() {
        contexts.push(this)
      }
    }

    vi.stubGlobal('window', { AudioContext: TestAudioContext })
    const manager = await import('../../src/engine/audio/contextManager')

    const staleStart = manager.startAudioContext()
    expect(manager.startAudioContext()).toBe(staleStart)
    expect(contexts).toHaveLength(1)

    await manager.closeAudioContext()
    const invalidatedStart = manager.startAudioContext()

    await expect(invalidatedStart).resolves.toBe('off')
    expect(contexts).toHaveLength(1)

    firstResume.resolve()

    await expect(staleStart).resolves.toBe('off')
    const replacementStart = manager.startAudioContext()

    await expect(replacementStart).resolves.toBe('on')
    expect(contexts).toHaveLength(2)
    expect(contexts[0]?.state).toBe('closed')
    expect(contexts[1]?.state).toBe('running')
    expect(manager.getAudioContext()).toBe(contexts[1])

    await manager.closeAudioContext()
  })

  it('does not start audio while teardown is still closing a context', async () => {
    const closeContext = deferred()
    const contexts: TestAudioContext[] = []

    class TestAudioContext {
      state: ContextState = 'suspended'
      readonly resume = vi.fn(async () => {
        if (this.state !== 'closed') this.state = 'running'
      })
      readonly close = vi.fn(async () => {
        await closeContext.promise
        this.state = 'closed'
      })

      constructor() {
        contexts.push(this)
      }
    }

    vi.stubGlobal('window', { AudioContext: TestAudioContext })
    const manager = await import('../../src/engine/audio/contextManager')

    await expect(manager.startAudioContext()).resolves.toBe('on')
    const closing = manager.closeAudioContext()
    await Promise.resolve()

    const invalidatedStart = manager.startAudioContext()

    await expect(invalidatedStart).resolves.toBe('off')
    expect(contexts).toHaveLength(1)
    expect(contexts[0]?.resume).toHaveBeenCalledTimes(1)

    closeContext.resolve()
    await closing

    await expect(manager.startAudioContext()).resolves.toBe('on')
    expect(contexts).toHaveLength(2)
    expect(contexts[1]?.resume).toHaveBeenCalledTimes(1)

    await manager.closeAudioContext()
  })
})
