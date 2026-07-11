import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function validatePort(port) {
  const value = Number(port)
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`Invalid server port: ${String(port)}`)
  }
  return value
}

export function validateLoopbackHost(host) {
  if (!LOOPBACK_HOSTS.has(host)) throw new Error(`Server host must be loopback: ${String(host)}`)
  return host
}

export function validateLoopbackBaseUrl(baseUrl) {
  const url = new URL(baseUrl)
  if (
    url.protocol !== 'http:' ||
    !LOOPBACK_HOSTS.has(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(`Server readiness URL must be loopback HTTP: ${baseUrl}`)
  }
  validatePort(url.port)
  return url.href
}

export async function isServerUp(baseUrl) {
  const readinessUrl = validateLoopbackBaseUrl(baseUrl)
  try {
    const res = await fetch(readinessUrl)
    return res.ok
  } catch {
    return false
  }
}

export async function waitForServerReady(baseUrl, timeoutMs, label = 'Dev server') {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await isServerUp(baseUrl)) return
    await delay(200)
  }
  throw new Error(`${label} did not become ready within ${timeoutMs}ms (${baseUrl})`)
}

export function spawnNpmServer(script, host, port, cwd = process.cwd()) {
  const safeHost = validateLoopbackHost(host)
  const safePort = validatePort(port)
  return spawn('npm', ['run', script, '--', '--host', safeHost, '--port', String(safePort)], {
    cwd,
    stdio: 'pipe',
    env: process.env,
  })
}

export async function stopServer(proc) {
  if (!proc || proc.exitCode != null) return
  proc.kill('SIGTERM')
  const exited = await Promise.race([
    new Promise((resolve) => {
      proc.once('exit', () => resolve(true))
    }),
    delay(3000).then(() => false),
  ])
  if (!exited && proc.exitCode == null) {
    proc.kill('SIGKILL')
    await Promise.race([
      new Promise((resolve) => {
        proc.once('exit', () => resolve())
      }),
      delay(1000),
    ])
  }
  proc.stdout?.destroy()
  proc.stderr?.destroy()
  proc.stdin?.destroy()
}

export async function createDevServerHarness(baseUrl, host, port, overrides = {}) {
  const checkServer = overrides.isServerUp ?? isServerUp
  const spawnServer = overrides.spawnNpmServer ?? spawnNpmServer
  const waitUntilReady = overrides.waitForServerReady ?? waitForServerReady
  const stopSpawnedServer = overrides.stopServer ?? stopServer
  let ownsServer = false
  let serverProc = null

  if (!(await checkServer(baseUrl))) {
    ownsServer = true
    serverProc = spawnServer('dev', host, port)
    try {
      await waitUntilReady(baseUrl, 20_000)
    } catch (error) {
      await stopSpawnedServer(serverProc)
      throw error
    }
  }

  return { ownsServer, serverProc, destroyed: false, stopServer: stopSpawnedServer }
}

export async function destroyServerHarness(harness) {
  if (harness.destroyed) return
  harness.destroyed = true
  if (harness.ownsServer) {
    await harness.stopServer(harness.serverProc)
  }
}

export async function createBrowserServerHarness(baseUrl, host, port, launchBrowser, overrides) {
  const server = await createDevServerHarness(baseUrl, host, port, overrides)
  try {
    const browser = await launchBrowser()
    return { browser, ...server }
  } catch (error) {
    await destroyServerHarness(server)
    throw error
  }
}

export async function destroyBrowserServerHarness(harness) {
  try {
    await harness.browser.close()
  } finally {
    await destroyServerHarness(harness)
  }
}
