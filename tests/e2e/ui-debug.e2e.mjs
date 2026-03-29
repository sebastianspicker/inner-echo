import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const HOST = '127.0.0.1'
const PORT = 4173
const BASE_URL = `http://${HOST}:${PORT}`
const ONBOARDING_KEY = 'inner-echo-onboarding-accepted'

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
  return spawn('npm', ['run', 'dev', '--', '--host', HOST, '--port', String(PORT)], {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: process.env,
  })
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

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  })

  return { browser, ownsServer, serverProc }
}

async function destroyHarness(h) {
  await h.browser.close()
  if (h.ownsServer) {
    await stopServer(h.serverProc)
  }
}

async function newContextPage(h, viewport = { width: 1280, height: 720 }) {
  const context = await h.browser.newContext({ viewport })
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
      if (wantsVideo) {
        return w.__ieE2eCanvas.captureStream(30)
      }
      if (wantsAudio) {
        throw new DOMException('Mic denied in e2e', 'NotAllowedError')
      }
      return w.__ieOrigGetUserMedia(constraints)
    }
  })
}

async function startCamera(page) {
  await page.getByRole('button', { name: /^start camera$/i }).click()
  await expectCameraLabel(page, /läuft/i, 3000)
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

async function collectConsole(page, run) {
  const all = []
  const webglLike = []
  const re = /(WebGL|THREE\.WebGLProgram|Shader Error|INVALID_OPERATION)/i
  const onConsole = (msg) => {
    const text = `${msg.type().toUpperCase()} ${msg.text()}`
    all.push(text)
    if (re.test(text)) webglLike.push(text)
  }
  page.on('console', onConsole)
  try {
    await run()
  } finally {
    page.off('console', onConsole)
  }
  return { all, webglLike }
}

const tests = [
  {
    name: 'no WebGL/shader errors during rapid condition switching',
    run: async (h) => {
      const { context, page } = await newContextPage(h)
      try {
        await installFakeMedia(page)
        await startCamera(page)
        const capture = await collectConsole(page, async () => {
          await page.evaluate(async () => {
            const select = document.querySelector('#condition-picker')
            if (!select) throw new Error('condition picker not found')
            const values = Array.from(select.options).map((o) => o.value)
            for (let round = 0; round < 3; round += 1) {
              for (const value of values) {
                select.value = value
                select.dispatchEvent(new Event('change', { bubbles: true }))
                await new Promise((resolve) => setTimeout(resolve, 35))
              }
            }
          })
          await delay(300)
        })
        assert.equal(
          capture.webglLike.length,
          0,
          `Expected no WebGL/shader console noise, got ${capture.webglLike.length}`,
        )
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'multimorbid and symptom mode transitions remain stable with active camera',
    run: async (h) => {
      const { context, page } = await newContextPage(h)
      try {
        await installFakeMedia(page)
        await startCamera(page)
        const capture = await collectConsole(page, async () => {
          await page.getByRole('radio', { name: /^multimorbid$/i }).check()
          const multimorbid = page.locator('[aria-label="Multimorbid preset stack"]')
          await assert.doesNotReject(async () => {
            await multimorbid.waitFor({ state: 'visible', timeout: 3000 })
          })
          const presetChecks = multimorbid.getByRole('checkbox')
          const presetCount = await presetChecks.count()
          assert.ok(
            presetCount >= 2,
            `Expected at least 2 multimorbid preset checkboxes, got ${presetCount}`,
          )
          await presetChecks.nth(0).check()
          await presetChecks.nth(1).check()
          await delay(120)
          const presetWeights = multimorbid.locator('input[type="range"]')
          if ((await presetWeights.count()) > 0) {
            await presetWeights.first().fill('0.71')
          }
          await delay(180)

          await page.getByRole('radio', { name: /^symptom-first$/i }).check()
          const symptom = page.locator('[aria-label="Symptom-first dimensions"]')
          await assert.doesNotReject(async () => {
            await symptom.waitFor({ state: 'visible', timeout: 3000 })
          })
          const dimChecks = symptom.getByRole('checkbox')
          const dimCount = await dimChecks.count()
          assert.ok(
            dimCount >= 2,
            `Expected at least 2 symptom dimension checkboxes, got ${dimCount}`,
          )
          await dimChecks.nth(0).check()
          await dimChecks.nth(1).check()
          await delay(120)
          const dimWeights = symptom.locator('input[type="range"]')
          if ((await dimWeights.count()) > 0) {
            await dimWeights.first().fill('0.63')
          }
          await delay(180)
          const summaryItems = symptom.locator('.composer__summary li')
          assert.ok(
            (await summaryItems.count()) >= 1,
            'Expected symptom summary to list selected dimensions',
          )

          await page.getByRole('radio', { name: /^preset$/i }).check()
          await assert.doesNotReject(async () => {
            await page.locator('#condition-picker').waitFor({ state: 'visible', timeout: 3000 })
          })
          await delay(240)
          await page.getByRole('button', { name: /stop everything/i }).click()
          await expectCameraLabel(page, /(aus|fehler|verweigert|error)/i, 3000)
        })
        assert.equal(
          capture.webglLike.length,
          0,
          `Expected no WebGL/shader console noise during mode transitions, got ${capture.webglLike.length}`,
        )
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'camera state downgrades after active track ends',
    run: async (h) => {
      const { context, page } = await newContextPage(h)
      try {
        await installFakeMedia(page)
        await startCamera(page)
        await page.evaluate(() => {
          const video = document.querySelector('video')
          const stream = video?.srcObject
          if (stream instanceof MediaStream) {
            const track = stream.getVideoTracks()[0]
            track?.stop()
          }
        })
        await expectCameraLabel(page, /(aus|fehler|verweigert|error)/i, 3000)
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'stop everything returns idle camera state without interruption error callout',
    run: async (h) => {
      const { context, page } = await newContextPage(h)
      try {
        await installFakeMedia(page)
        await startCamera(page)
        await page.getByRole('button', { name: /stop everything/i }).click()
        await expectCameraLabel(page, /aus/i, 3000)
        const hasErrorCallout = await page
          .locator('.ie-callout.ie-callout--error[aria-label="Camera error"]')
          .isVisible()
          .catch(() => false)
        assert.equal(
          hasErrorCallout,
          false,
          'Stop Everything should not surface interruption error state',
        )
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'microphone toggle is disabled until audio is enabled and hint is visible',
    run: async (h) => {
      const { context, page } = await newContextPage(h)
      try {
        const result = await page.evaluate(() => {
          const toggleLabels = Array.from(
            document.querySelectorAll('.composer__toggles .composer__toggle'),
          )
          const micLabel = toggleLabels.find((l) =>
            (l.textContent ?? '').toLowerCase().includes('microphone'),
          )
          const micInput = micLabel?.querySelector('input[type="checkbox"]')
          const hint = document.querySelector('.composer__micPrereqHint')
          return {
            micDisabled: !!micInput?.disabled,
            hintVisible: !!hint,
          }
        })
        assert.equal(result.micDisabled, true, 'Mic toggle should be disabled when audio is off')
        assert.equal(result.hintVisible, true, 'Mic precondition hint should be visible')
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'debug overlay is off by default',
    run: async (h) => {
      const { context, page } = await newContextPage(h)
      try {
        const result = await page.evaluate(() => {
          const checkbox = document.querySelector('input[aria-label="Debug overlay (dev)"]')
          const panel = document.querySelector('.debug-panel')
          return { hasToggle: !!checkbox, checked: !!checkbox?.checked, panelMounted: !!panel }
        })
        assert.equal(result.hasToggle, true, 'Debug toggle must be present in DEV UI')
        assert.equal(result.checked, false, 'Debug toggle must default to unchecked')
        assert.equal(result.panelMounted, false, 'Debug panel must not mount by default')
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'no missing favicon response on initial load',
    run: async (h) => {
      const context = await h.browser.newContext({ viewport: { width: 1280, height: 720 } })
      const page = await context.newPage()
      try {
        let favicon404 = false
        page.on('response', (resp) => {
          if (resp.url().endsWith('/favicon.ico') && resp.status() === 404) {
            favicon404 = true
          }
        })
        await page.addInitScript((key) => {
          try {
            localStorage.setItem(key, 'true')
          } catch {
            // ignore
          }
        }, ONBOARDING_KEY)
        await page.goto(BASE_URL, { waitUntil: 'networkidle' })
        await delay(300)
        assert.equal(favicon404, false, 'Initial load should not produce favicon.ico 404')
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'primary mobile controls meet 44px touch target height',
    run: async (h) => {
      const { context, page } = await newContextPage(h, { width: 390, height: 844 })
      try {
        const metrics = await page.evaluate(() => {
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
          `Found controls below 44px: ${tooSmall.map((x) => `${x.text}:${x.h}`).join(', ')}`,
        )
      } finally {
        await context.close()
      }
    },
  },
]

async function main() {
  const harness = await createHarness()
  const failures = []

  for (const test of tests) {
    const started = Date.now()
    try {
      await test.run(harness)
      const elapsed = Date.now() - started
      console.log(`PASS ${test.name} (${elapsed}ms)`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      failures.push(`${test.name}: ${message}`)
      console.error(`FAIL ${test.name}: ${message}`)
    }
  }

  await destroyHarness(harness)

  if (failures.length > 0) {
    console.error('\nE2E failures:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
