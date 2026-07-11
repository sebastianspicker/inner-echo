import { spawn } from 'node:child_process'
import { spawnNpmServer, stopServer, waitForServerReady } from '../tests/e2e/serverHarness.mjs'

const HOST = process.env.HOST ?? '127.0.0.1'
const PORT = process.env.PORT ?? '4174'
const BASE_URL = `http://${HOST}:${PORT}`

function spawnPreviewServer() {
  return spawnNpmServer('preview', HOST, PORT)
}

async function main() {
  const serverProc = spawnPreviewServer()
  try {
    await waitForServerReady(BASE_URL, 20_000, 'Preview server')
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
