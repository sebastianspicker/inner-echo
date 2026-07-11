// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import {
  createBrowserServerHarness,
  createDevServerHarness,
  destroyBrowserServerHarness,
  destroyServerHarness,
  isServerUp,
  validateLoopbackBaseUrl,
  validateLoopbackHost,
  validatePort,
} from './e2e/serverHarness.mjs'

describe('E2E server trust boundary', () => {
  it.each(['localhost', '127.0.0.1', '[::1]'])('accepts loopback host %s', (host) => {
    expect(validateLoopbackHost(host)).toBe(host)
  })

  it.each([
    '0.0.0.0',
    'example.com',
    '127.0.0.2',
    'localhost.example.com',
  ])('rejects non-loopback host %s', (host) =>
    expect(() => validateLoopbackHost(host)).toThrow(/loopback/))

  it.each([0, 65_536, -1, 1.5, 'not-a-port'])('rejects invalid port %s', (port) => {
    expect(() => validatePort(port)).toThrow(/Invalid server port/)
  })

  it.each([
    'https://127.0.0.1:4173/',
    'http://example.com:4173/',
    'http://127.0.0.1:4173/health',
    'http://user@127.0.0.1:4173/',
    'http://127.0.0.1:70000/',
  ])('rejects unsafe readiness URL %s', (url) => {
    expect(() => validateLoopbackBaseUrl(url)).toThrow()
  })

  it('rejects an unsafe URL before attempting a request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(isServerUp('http://example.com:4173/')).rejects.toThrow(/loopback/)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('stops a spawned server when readiness fails', async () => {
    const proc = { id: 'server' }
    const stopServer = vi.fn().mockResolvedValue(undefined)
    await expect(
      createDevServerHarness('http://127.0.0.1:4173/', '127.0.0.1', 4173, {
        isServerUp: vi.fn().mockResolvedValue(false),
        spawnNpmServer: vi.fn().mockReturnValue(proc),
        waitForServerReady: vi.fn().mockRejectedValue(new Error('not ready')),
        stopServer,
      }),
    ).rejects.toThrow('not ready')
    expect(stopServer).toHaveBeenCalledOnce()
    expect(stopServer).toHaveBeenCalledWith(proc)
  })

  it('cleans up once when browser launch fails or destruction repeats', async () => {
    const stopServer = vi.fn().mockResolvedValue(undefined)
    const overrides = {
      isServerUp: vi.fn().mockResolvedValue(false),
      spawnNpmServer: vi.fn().mockReturnValue({ id: 'server' }),
      waitForServerReady: vi.fn().mockResolvedValue(undefined),
      stopServer,
    }
    await expect(
      createBrowserServerHarness(
        'http://127.0.0.1:4173/',
        '127.0.0.1',
        4173,
        vi.fn().mockRejectedValue(new Error('browser failed')),
        overrides,
      ),
    ).rejects.toThrow('browser failed')
    expect(stopServer).toHaveBeenCalledOnce()

    const harness = await createBrowserServerHarness(
      'http://127.0.0.1:4173/',
      '127.0.0.1',
      4173,
      vi.fn().mockResolvedValue({ close: vi.fn().mockResolvedValue(undefined) }),
      overrides,
    )
    await destroyBrowserServerHarness(harness)
    await destroyServerHarness(harness)
    expect(stopServer).toHaveBeenCalledTimes(2)
  })

  it('can acquire the same port after a failed transactional attempt', async () => {
    const stopServer = vi.fn().mockResolvedValue(undefined)
    const spawnNpmServer = vi.fn().mockReturnValue({ id: 'server' })
    const common = {
      isServerUp: vi.fn().mockResolvedValue(false),
      spawnNpmServer,
      stopServer,
    }
    await expect(
      createDevServerHarness('http://127.0.0.1:4173/', '127.0.0.1', 4173, {
        ...common,
        waitForServerReady: vi.fn().mockRejectedValue(new Error('not ready')),
      }),
    ).rejects.toThrow('not ready')
    const harness = await createDevServerHarness('http://127.0.0.1:4173/', '127.0.0.1', 4173, {
      ...common,
      waitForServerReady: vi.fn().mockResolvedValue(undefined),
    })
    expect(spawnNpmServer).toHaveBeenCalledTimes(2)
    await destroyServerHarness(harness)
  })
})
