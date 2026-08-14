import { spawn } from 'node:child_process'
import { spawnNpmServer, stopServer, waitForServerReady } from './support/server.mjs'

const HOST = process.env.HOST ?? '127.0.0.1'
const PORT = process.env.PORT ?? '4174'
const BASE_PATH = process.env.BASE_PATH ?? '/'
const BASE_URL = new URL(BASE_PATH, `http://${HOST}:${PORT}`).href
const PREVIEW_SCRIPT = process.env.PREVIEW_SCRIPT ?? 'preview'

function spawnPreviewServer() {
  return spawnNpmServer(PREVIEW_SCRIPT, HOST, PORT)
}

async function main() {
  const serverProc = spawnPreviewServer()
  try {
    await waitForServerReady(BASE_URL, 20_000, 'Preview server')
    const child = spawn('node', ['tests/e2e/cross-browser.e2e.mjs'], {
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
