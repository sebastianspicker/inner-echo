import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

export async function isServerUp(baseUrl) {
  try {
    const res = await fetch(baseUrl)
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
  return spawn('npm', ['run', script, '--', '--host', host, '--port', String(port)], {
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

export async function createDevServerHarness(baseUrl, host, port) {
  let ownsServer = false
  let serverProc = null

  if (!(await isServerUp(baseUrl))) {
    ownsServer = true
    serverProc = spawnNpmServer('dev', host, port)
    await waitForServerReady(baseUrl, 20_000)
  }

  return { ownsServer, serverProc }
}

export async function destroyServerHarness(harness) {
  if (harness.ownsServer) {
    await stopServer(harness.serverProc)
  }
}
