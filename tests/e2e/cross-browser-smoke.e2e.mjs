import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, firefox, webkit } from 'playwright'

const HOST = '127.0.0.1'
const PORT = 4173
const BASE_URL = `http://${HOST}:${PORT}`
const ONBOARDING_KEY = 'inner-echo-onboarding-accepted'

const BROWSERS = [
  { name: 'chrome', launcher: chromium, launchOptions: { channel: 'chrome' } },
  { name: 'firefox', launcher: firefox, launchOptions: {} },
  { name: 'webkit', launcher: webkit, launchOptions: {} },
]

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
  throw new Error(`Dev server did not become ready within ${timeoutMs}ms (${BASE_URL})`)
}

function spawnDevServer() {
  return spawn(
    'npm',
    ['run', 'dev', '--', '--host', HOST, '--port', String(PORT)],
    {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: process.env,
    }
  )
}

async function stopServer(proc) {
  if (!proc) return
  if (proc.killed || proc.exitCode != null) return
  proc.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => {
      proc.once('exit', () => resolve())
    }),
    delay(3000).then(() => {
      if (!proc.killed && proc.exitCode == null) proc.kill('SIGKILL')
    }),
  ])
}

async function createHarness() {
  let ownsServer = false
  let serverProc = null
  const alreadyUp = await isServerUp()
  if (!alreadyUp) {
    ownsServer = true
    serverProc = spawnDevServer()
    await waitForServerReady(20_000)
  }
  return { ownsServer, serverProc }
}

async function destroyHarness(h) {
  if (h.ownsServer) {
    await stopServer(h.serverProc)
  }
}

async function newContextPage(browser, viewport = { width: 1280, height: 720 }) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.addInitScript((key) => {
    try {
      localStorage.setItem(key, 'true')
    } catch {
      // ignore
    }
  }, ONBOARDING_KEY)
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  return { context, page }
}

async function installFakeMedia(page) {
  await page.evaluate(() => {
    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices) return
    const w = window

    if (!w.__ieOrigGetUserMedia) {
      w.__ieOrigGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices)
    }

    if (!w.__ieE2eCanvas) {
      const c = document.createElement('canvas')
      c.width = 640
      c.height = 480
      const ctx = c.getContext('2d')
      let t = 0
      const tick = () => {
        if (!ctx) return
        t += 0.03
        ctx.fillStyle = '#101827'
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.fillStyle = '#7bc8c0'
        const x = (Math.sin(t) * 0.4 + 0.5) * (c.width - 140)
        ctx.fillRect(x, 170, 140, 100)
        ctx.fillStyle = '#c7d2fe'
        ctx.font = '20px sans-serif'
        ctx.fillText('inner-echo e2e cam', 16, 32)
        w.__ieE2eRaf = requestAnimationFrame(tick)
      }
      tick()
      w.__ieE2eCanvas = c
    }

    mediaDevices.getUserMedia = async (constraints) => {
      const wantsVideo = !!constraints.video
      const wantsAudio = !!constraints.audio
      if (wantsVideo) return w.__ieE2eCanvas.captureStream(30)
      if (wantsAudio) throw new DOMException('Mic denied in cross-browser e2e', 'NotAllowedError')
      return w.__ieOrigGetUserMedia(constraints)
    }
  })
}

async function expectCameraLabel(page, regex, timeoutMs) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const label = await page.locator('.ie-pillVal').first().innerText()
    if (regex.test(label)) return
    await delay(100)
  }
  const finalLabel = await page.locator('.ie-pillVal').first().innerText()
  throw new Error(`Camera label did not match ${regex}; final="${finalLabel}"`)
}

async function runSmoke(browserName, browser) {
  const { context, page } = await newContextPage(browser)
  const disallowedConsole = []
  const re = /(WebGL|THREE\.WebGLProgram|Shader Error|INVALID_OPERATION|TypeError|ReferenceError)/i
  const onConsole = (msg) => {
    const text = msg.text()
    if (msg.type() === 'error' || re.test(text)) {
      disallowedConsole.push(`${msg.type().toUpperCase()} ${text}`)
    }
  }
  page.on('console', onConsole)
  try {
    await installFakeMedia(page)
    await page.getByRole('button', { name: /^start camera$/i }).click()
    await expectCameraLabel(page, /läuft/i, 3000)

    await page.evaluate(async () => {
      const select = document.querySelector('#condition-picker')
      if (!select) throw new Error('condition picker not found')
      const values = Array.from(select.options).map((o) => o.value).slice(0, 4)
      for (const value of values) {
        select.value = value
        select.dispatchEvent(new Event('change', { bubbles: true }))
        await new Promise((resolve) => setTimeout(resolve, 40))
      }
    })
    await delay(250)
    await page.getByRole('button', { name: /stop everything/i }).click()
    await expectCameraLabel(page, /(aus|fehler|verweigert|error)/i, 3000)

    assert.equal(
      disallowedConsole.length,
      0,
      `${browserName}: disallowed console output detected\n${disallowedConsole.join('\n')}`
    )
  } finally {
    page.off('console', onConsole)
    await context.close()
  }

  const mobile = await newContextPage(browser, { width: 390, height: 844 })
  try {
    const metrics = await mobile.page.evaluate(() => {
      const read = (selector) =>
        Array.from(document.querySelectorAll(selector)).map((el) => {
          const r = el.getBoundingClientRect()
          return {
            selector,
            text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30),
            h: Math.round(r.height),
          }
        })
      return {
        headerButtons: read('.ie-actions .ie-btn'),
        quickButtons: read('.composer__quick-buttons button'),
      }
    })
    const tooSmall = [...metrics.headerButtons, ...metrics.quickButtons].filter((x) => x.h < 44)
    assert.equal(
      tooSmall.length,
      0,
      `${browserName}: controls below 44px touch target: ${tooSmall.map((x) => `${x.text}:${x.h}`).join(', ')}`
    )
  } finally {
    await mobile.context.close()
  }
}

async function main() {
  const harness = await createHarness()
  const failures = []

  for (const { name, launcher, launchOptions } of BROWSERS) {
    const started = Date.now()
    try {
      const browser = await launcher.launch({ headless: true, ...(launchOptions ?? {}) })
      try {
        await runSmoke(name, browser)
      } finally {
        await browser.close()
      }
      const elapsed = Date.now() - started
      console.log(`PASS ${name} cross-browser smoke (${elapsed}ms)`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      failures.push(`${name}: ${message}`)
      console.error(`FAIL ${name} cross-browser smoke: ${message}`)
    }
  }

  await destroyHarness(harness)

  if (failures.length > 0) {
    console.error('\nCross-browser smoke failures:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
