// Characterizes the experience session's sound-engine start/cancellation ordering
// (docs/decisions/0001-direct-user-media-activation.md): the AudioContext starts inside
// the direct action, the engine module loads afterward behind a request-sequence guard,
// and only the latest request may install an engine. Dependencies are injected directly
// (no vi.mock by path).
import { describe, expect, it, vi } from 'vitest'
import { createExperienceSession } from '../../src/runtime/session/session'
import type {
  AudioContextStatus,
  AudioEngineControl,
  AudioEngineFactory,
} from '../../src/runtime/audio'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function createControl(): AudioEngineControl {
  return {
    stop: vi.fn(),
    requestMic: vi.fn(),
    stopMic: vi.fn(),
    setConditionAudio: vi.fn(),
    setMasterVolume: vi.fn(),
    setInputMode: vi.fn(),
    setMicSensitivity: vi.fn(),
    setMicGate: vi.fn(),
    applyReactiveParams: vi.fn(),
    getRms: vi.fn(() => 0),
    getMetrics: vi.fn(() => ({ rms: 0, centroid: 0, flux: 0 })),
    getDebugState: vi.fn(),
  } as unknown as AudioEngineControl
}

function createDeps() {
  const startAudioContext = vi.fn<() => Promise<AudioContextStatus>>()
  const closeAudioContext = vi.fn().mockResolvedValue(undefined)
  const loadAudioEngine = vi.fn<() => Promise<AudioEngineFactory>>()
  return { startAudioContext, closeAudioContext, loadAudioEngine }
}

/** Resolves a pending engine import after cancellation and asserts it was discarded. */
async function expectDiscardedImport(
  resolveEngineImport: (factory: AudioEngineFactory) => void,
  closeAudioContext: ReturnType<typeof vi.fn>,
): Promise<void> {
  const createEngine = vi.fn(() => createControl())
  resolveEngineImport(createEngine)
  await Promise.resolve()
  await Promise.resolve()

  expect(createEngine).not.toHaveBeenCalled()
  expect(closeAudioContext).toHaveBeenCalled()
}

describe('deferred audio engine loading', () => {
  it('starts the AudioContext in the action before requesting the engine module', async () => {
    const deps = createDeps()
    const contextStart = deferred<AudioContextStatus>()
    deps.startAudioContext.mockReturnValue(contextStart.promise)
    const session = createExperienceSession(deps)

    session.enableSound()

    expect(deps.startAudioContext).toHaveBeenCalledOnce()
    expect(deps.loadAudioEngine).not.toHaveBeenCalled()
    expect(session.getSnapshot().sound).toBe('starting')

    const control = createControl()
    const createEngine = vi.fn(() => control)
    deps.loadAudioEngine.mockResolvedValue(createEngine)
    contextStart.resolve('on')
    await contextStart.promise
    await Promise.resolve()
    await Promise.resolve()

    expect(createEngine).toHaveBeenCalledOnce()
    expect(session.getSnapshot().sound).toBe('on')
  })

  it.each([
    { name: 'direct disable', enable: 'enableSound', cancel: 'disableSound' },
    { name: 'audio toggle switched off', enable: 'setSoundEnabled', cancel: 'setSoundEnabled' },
  ] as const)('discards a late engine import after $name', async ({ enable, cancel }) => {
    const deps = createDeps()
    const engineImport = deferred<AudioEngineFactory>()
    deps.startAudioContext.mockResolvedValue('on')
    deps.loadAudioEngine.mockReturnValue(engineImport.promise)
    const session = createExperienceSession(deps)

    if (enable === 'setSoundEnabled') session.setSoundEnabled(true)
    else session.enableSound()
    await Promise.resolve()
    await Promise.resolve()

    if (cancel === 'setSoundEnabled') session.setSoundEnabled(false)
    else session.disableSound()
    await expectDiscardedImport(engineImport.resolve, deps.closeAudioContext)

    expect(session.getSnapshot().sound).toBe('off')
    expect(session.getSnapshot().soundEnabled).toBe(false)
  })
})

describe('audio start cancellation and active-engine ordering', () => {
  it('invalidates a delayed context start when Stop Everything wins the race', async () => {
    const deps = createDeps()
    const contextStart = deferred<AudioContextStatus>()
    deps.startAudioContext.mockReturnValue(contextStart.promise)
    const session = createExperienceSession(deps)

    session.enableSound()
    session.stopEverything()
    contextStart.resolve('on')
    await Promise.resolve()
    await Promise.resolve()

    expect(deps.loadAudioEngine).not.toHaveBeenCalled()
    expect(deps.closeAudioContext).toHaveBeenCalled()
    expect(session.getSnapshot().sound).toBe('off')
  })

  it('does not restart or stop an engine that is already on', async () => {
    const deps = createDeps()
    deps.startAudioContext.mockResolvedValue('on')
    const control = createControl()
    const createEngine = vi.fn(() => control)
    deps.loadAudioEngine.mockResolvedValue(createEngine)
    const session = createExperienceSession(deps)

    session.enableSound()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    session.enableSound()

    expect(deps.startAudioContext).toHaveBeenCalledOnce()
    expect(deps.loadAudioEngine).toHaveBeenCalledOnce()
    expect(createEngine).toHaveBeenCalledOnce()
    expect(control.stop).not.toHaveBeenCalled()
  })
})

describe('deferred audio engine failure cleanup', () => {
  // Unlike the former React-hook implementation, session state mutates synchronously,
  // so a second immediate enableSound() call observes 'starting' right away and is a
  // real no-op (matching the documented guard) instead of racing a second start.
  it('ignores a second immediate enableSound call while the first is still starting', async () => {
    const deps = createDeps()
    const contextStart = deferred<AudioContextStatus>()
    deps.startAudioContext.mockReturnValue(contextStart.promise)
    const createEngine = vi.fn(() => createControl())
    deps.loadAudioEngine.mockResolvedValue(createEngine)
    const session = createExperienceSession(deps)

    session.enableSound()
    session.enableSound()
    contextStart.resolve('on')
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(deps.startAudioContext).toHaveBeenCalledOnce()
    expect(deps.loadAudioEngine).toHaveBeenCalledOnce()
    expect(createEngine).toHaveBeenCalledOnce()
    expect(session.getSnapshot().sound).toBe('on')
  })

  it('recovers after an engine import error without retaining the failed context', async () => {
    const deps = createDeps()
    deps.startAudioContext.mockResolvedValue('on')
    deps.loadAudioEngine.mockRejectedValueOnce(new Error('chunk unavailable'))
    const session = createExperienceSession(deps)

    session.enableSound()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(deps.closeAudioContext).toHaveBeenCalledOnce()
    expect(session.getSnapshot().sound).toBe('error')
    expect(session.getSnapshot().soundError).toBe('chunk unavailable')
    expect(session.getSnapshot().soundEnabled).toBe(false)

    const createEngine = vi.fn(() => createControl())
    deps.loadAudioEngine.mockResolvedValueOnce(createEngine)
    session.enableSound()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(createEngine).toHaveBeenCalledOnce()
    expect(session.getSnapshot().sound).toBe('on')
    expect(session.getSnapshot().soundError).toBeNull()
  })

  it('invalidates an in-flight import on release (unmount)', async () => {
    const deps = createDeps()
    const engineImport = deferred<AudioEngineFactory>()
    deps.startAudioContext.mockResolvedValue('on')
    deps.loadAudioEngine.mockReturnValue(engineImport.promise)
    const session = createExperienceSession(deps)

    session.enableSound()
    await Promise.resolve()
    await Promise.resolve()

    session.release()
    await expectDiscardedImport(engineImport.resolve, deps.closeAudioContext)
  })
})
