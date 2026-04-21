import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const HOST = process.env.HOST ?? '127.0.0.1'
const PORT = process.env.PORT ?? '4174'
const BASE_URL = `http://${HOST}:${PORT}`

async function isServerUp() {
  try {
    const res = await fetch(BASE_URL)
    return res.ok
  } catch {
    return false
  }
}

async function waitForServerReady(timeoutMs) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await isServerUp()) return
    await delay(200)
  }
  throw new Error(`Preview server did not become ready within ${timeoutMs}ms (${BASE_URL})`)
}

function spawnPreviewServer() {
  return spawn('npm', ['run', 'preview', '--', '--host', HOST, '--port', PORT], {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: process.env,
  })
}

async function stopServer(proc) {
  if (!proc) return
  if (proc.exitCode != null) return
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

async function main() {
  const serverProc = spawnPreviewServer()
  try {
    await waitForServerReady(20_000)
    const child = spawn('node', ['tests/e2e/cross-browser-smoke.e2e.mjs'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: { ...process.env, HOST, PORT },
    })

    const exitCode = await new Promise((resolve, reject) => {
      child.once('exit', (code) => resolve(code ?? 1))
      child.once('error', reject)
    })

    process.exitCode = exitCode
  } finally {
    await stopServer(serverProc)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
