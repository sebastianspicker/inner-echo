import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'
import { createDevServerHarness, destroyServerHarness } from './serverHarness.mjs'

const HOST = process.env.HOST ?? '127.0.0.1'
const PORT = Number(process.env.PORT ?? '4173')
const BASE_URL = `http://${HOST}:${PORT}`
const ONBOARDING_KEY = 'inner-echo-welcome-acknowledged-v2'

async function createHarness() {
  const server = await createDevServerHarness(BASE_URL, HOST, PORT)
  const browser = await launchChromium()
  return { browser, ...server }
}

async function launchChromium() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("Executable doesn't exist")) {
      throw new Error(
        'Chrome is not available for Playwright. Run `npm run browsers:install` and retry.',
      )
    }
    throw error
  }
}

async function destroyHarness(h) {
  await h.browser.close()
  await destroyServerHarness(h)
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
  await waitForAppShell(page)
  return { context, page }
}

async function newFirstRunPage(h, viewport = { width: 1280, height: 720 }) {
  const context = await h.browser.newContext({ viewport })
  const page = await context.newPage()
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await waitForAppShell(page)
  return { context, page }
}

async function waitForAppShell(page) {
  await page
    .locator('section[aria-label="Inner Echo"]')
    .waitFor({ state: 'visible', timeout: 5000 })
  await page.getByRole('banner').waitFor({ state: 'visible', timeout: 5000 })
  await page
    .getByRole('status', { name: 'Runtime status' })
    .waitFor({ state: 'visible', timeout: 5000 })
}

async function waitForAnimationFrames(page, frameCount = 2) {
  await page.evaluate(
    (count) =>
      new Promise((resolve) => {
        let remaining = count
        const step = () => {
          remaining -= 1
          if (remaining <= 0) {
            resolve(null)
            return
          }
          requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }),
    frameCount,
  )
}

async function forceWebglUnavailable(page) {
  await page.evaluate(() => {
    const proto = HTMLCanvasElement.prototype
    if (!proto.__ieOrigGetContext) {
      proto.__ieOrigGetContext = proto.getContext
    }
    proto.getContext = function patchedGetContext(type, ...args) {
      if (
        type === 'webgl' ||
        type === 'webgl2' ||
        type === 'experimental-webgl' ||
        type === 'experimental-webgl2'
      ) {
        return null
      }
      return proto.__ieOrigGetContext.call(this, type, ...args)
    }
  })
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

async function readDebugValue(page, label) {
  return page.evaluate((targetLabel) => {
    const terms = Array.from(document.querySelectorAll('.debug-panel__grid dt'))
    const term = terms.find((dt) => dt.textContent?.trim().toLowerCase() === targetLabel)
    return term?.nextElementSibling?.textContent?.trim() ?? null
  }, label.toLowerCase())
}

async function expectDebugValue(page, label, regex, timeoutMs) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const value = await readDebugValue(page, label)
    if (value && regex.test(value)) return
    await delay(100)
  }
  const finalValue = await readDebugValue(page, label)
  throw new Error(`Debug value ${label} did not match ${regex}; final="${finalValue}"`)
}

async function expectCanvasNonBlank(page, timeoutMs) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const stats = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      if (!canvas || canvas.width === 0 || canvas.height === 0) return null
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return null
      const width = Math.min(canvas.width, 96)
      const height = Math.min(canvas.height, 72)
      const data = ctx.getImageData(0, 0, width, height).data
      let nonBlank = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) nonBlank += 1
      }
      return { nonBlank, total: data.length / 4, width, height }
    })
    if (stats && stats.nonBlank > stats.total * 0.01) return
    await delay(100)
  }
  throw new Error('Fallback canvas did not produce nonblank 2D pixels')
}

async function expectElementText(page, selector, regex, timeoutMs) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const text = await page
      .locator(selector)
      .textContent()
      .catch(() => '')
    if (regex.test(text ?? '')) return
    await delay(100)
  }
  const finalText = await page
    .locator(selector)
    .textContent()
    .catch(() => '')
  throw new Error(`Element ${selector} did not match ${regex}; final="${finalText}"`)
}

async function startCamera(page) {
  await page.getByRole('button', { name: /^start camera$/i }).click()
  await expectCameraStatus(page, /active/i, 3000)
}

async function readCameraStatus(page) {
  return page.evaluate(() => {
    const pills = Array.from(document.querySelectorAll('.ie-statusRow .ie-pill'))
    const cameraPill = pills.find(
      (pill) => pill.querySelector('.ie-pillKey')?.textContent?.trim().toLowerCase() === 'camera',
    )
    const status = cameraPill?.querySelector('.ie-pillVal')?.textContent?.trim()
    if (!status) {
      throw new Error('Camera status pill not found')
    }
    return status
  })
}

async function expectCameraStatus(page, regex, timeoutMs) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const status = await readCameraStatus(page)
    if (regex.test(status)) return
    await delay(100)
  }
  const finalStatus = await readCameraStatus(page)
  throw new Error(`Camera status did not match ${regex}; final="${finalStatus}"`)
}

function isDisallowedWebglConsole(type, text) {
  return (
    /THREE\.WebGLProgram|Shader Error|INVALID_OPERATION/i.test(text) ||
    (type === 'error' && /WebGL/i.test(text))
  )
}

async function collectConsole(page, run) {
  const all = []
  const webglLike = []
  const onConsole = (msg) => {
    const text = `${msg.type().toUpperCase()} ${msg.text()}`
    all.push(text)
    if (isDisallowedWebglConsole(msg.type(), text)) webglLike.push(text)
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
    name: 'first-run welcome separates disclosure, setup, and camera activation',
    run: async (h) => {
      const { context, page } = await newFirstRunPage(h)
      try {
        const welcome = page.getByRole('heading', { name: /explore experience/i })
        await welcome.waitFor({ state: 'visible', timeout: 5000 })
        assert.equal(await page.getByRole('button', { name: /^start camera$/i }).count(), 0)

        await page.getByRole('button', { name: /continue to setup/i }).click()
        await welcome.waitFor({ state: 'hidden', timeout: 3000 })
        const startCameraButton = page.getByRole('button', { name: /^start camera$/i })
        assert.equal(
          await startCameraButton.isEnabled(),
          true,
          'Start camera should be enabled after the separate welcome step',
        )
        assert.equal(
          await page.evaluate((key) => localStorage.getItem(key), ONBOARDING_KEY),
          'true',
          'Welcome acknowledgement should persist in localStorage',
        )
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'comfort defaults inherit system reduced motion without starting media',
    run: async (h) => {
      const context = await h.browser.newContext({
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce',
      })
      const page = await context.newPage()
      await page.addInitScript((key) => localStorage.setItem(key, 'true'), ONBOARDING_KEY)
      try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' })
        await waitForAppShell(page)
        assert.equal(await page.getByLabel('Safe Mode').isChecked(), true)
        assert.equal(await page.getByLabel('Reduced Motion').isChecked(), true)
        await expectCameraStatus(page, /ready/i, 3000)
        assert.match(
          await page.getByRole('status', { name: 'Runtime status' }).innerText(),
          /audio\s+off/i,
        )
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'stop remains reachable after inactivity at 320px without horizontal overflow',
    run: async (h) => {
      const { context, page } = await newContextPage(h, { width: 320, height: 720 })
      try {
        await installFakeMedia(page)
        await startCamera(page)
        await delay(5200)
        const stop = page.getByRole('button', {
          name: /stop camera, microphone, sound, and effects/i,
        })
        assert.equal(await stop.isVisible(), true)
        assert.equal(await stop.isEnabled(), true)
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          true,
        )
        await stop.click()
        await expectCameraStatus(page, /ready/i, 3000)
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'evidence drawer opens from header and condition evidence buttons',
    run: async (h) => {
      const { context, page } = await newContextPage(h)
      try {
        await page.getByRole('button', { name: /^open method and evidence$/i }).click()
        await page.locator('dialog.evidence-dialog').waitFor({ state: 'visible', timeout: 5000 })
        await expectElementText(page, '#evidence-title', /evidence & method/i, 5000)
        await expectElementText(page, '.evidence-content', /non-diagnostic disclaimer/i, 5000)

        await page.getByRole('button', { name: /^close$/i }).click()
        await page.locator('dialog.evidence-dialog').waitFor({ state: 'hidden', timeout: 3000 })

        await page.getByLabel('Curated collections').check()
        await page.locator('#condition-picker').selectOption('anxiety')
        await page
          .getByRole('button', {
            name: /^open evidence doc docs\/references\/conditions\/anxiety\.md$/i,
          })
          .click()
        await expectElementText(page, '#evidence-title', /anxiety/i, 5000)
        await expectElementText(page, '.evidence-content', /condition preset.*anxiety/i, 5000)
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'no WebGL/shader errors during rapid condition switching',
    run: async (h) => {
      const { context, page } = await newContextPage(h)
      try {
        await installFakeMedia(page)
        await page.getByRole('radio', { name: /^curated collections$/i }).check()
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
                await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
              }
            }
          })
          await waitForAnimationFrames(page, 8)
        })
        assert.equal(
          capture.webglLike.length,
          0,
          `Expected no WebGL/shader console noise, got ${capture.webglLike.length}\n${capture.webglLike.join('\n')}`,
        )
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'forced WebGL unavailable falls back to nonblank Canvas2D output',
    run: async (h) => {
      const { context, page } = await newContextPage(h)
      try {
        await forceWebglUnavailable(page)
        await installFakeMedia(page)
        await startCamera(page)
        await page.locator('input[aria-label="Debug overlay (dev)"]').check()
        await expectDebugValue(page, 'renderer', /^2d$/i, 3000)
        await waitForAnimationFrames(page, 4)
        await expectCanvasNonBlank(page, 3000)
      } finally {
        await context.close()
      }
    },
  },
  {
    name: 'WebGL context loss reports raw preview instead of active effects',
    run: async (h) => {
      const { context, page } = await newContextPage(h)
      try {
        await installFakeMedia(page)
        await startCamera(page)
        await page.locator('input[aria-label="Debug overlay (dev)"]').check()
        await expectDebugValue(page, 'renderer', /^webgl$/i, 3000)
        await page.evaluate(() => {
          const canvas = document.querySelector('canvas')
          if (!canvas) throw new Error('overlay canvas not found')
          canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
        })
        await expectDebugValue(page, 'renderer', /^raw$/i, 3000)
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
          await page.getByRole('radio', { name: /^combine collections$/i }).check()
          const multimorbid = page.locator('[aria-label="Combined curated collections"]')
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
          const presetWeights = multimorbid.locator('input[type="range"]')
          if ((await presetWeights.count()) > 0) {
            await presetWeights.first().fill('0.71')
          }
          await waitForAnimationFrames(page, 2)

          await page.getByRole('radio', { name: /^experience dimensions$/i }).check()
          const symptom = page.locator('[aria-label="Experience dimensions"]')
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
          const dimWeights = symptom.locator('input[type="range"]')
          if ((await dimWeights.count()) > 0) {
            await dimWeights.first().fill('0.63')
          }
          await waitForAnimationFrames(page, 2)
          const summaryItems = symptom.locator('.composer__summary li')
          assert.ok(
            (await summaryItems.count()) >= 1,
            'Expected symptom summary to list selected dimensions',
          )

          await page.getByRole('radio', { name: /^curated collections$/i }).check()
          await assert.doesNotReject(async () => {
            await page.locator('#condition-picker').waitFor({ state: 'visible', timeout: 3000 })
          })
          await waitForAnimationFrames(page, 4)
          await page.getByRole('button', { name: /stop everything/i }).click()
          await expectCameraStatus(page, /ready/i, 3000)
        })
        assert.equal(
          capture.webglLike.length,
          0,
          `Expected no WebGL/shader console noise during mode transitions, got ${capture.webglLike.length}\n${capture.webglLike.join('\n')}`,
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
        await expectCameraStatus(page, /camera error/i, 3000)
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
        await expectCameraStatus(page, /ready/i, 3000)
        const hasErrorCallout = await page
          .locator('.ie-callout.ie-callout--error[aria-label="Camera notice"]')
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
    name: 'sound and microphone controls have one explicit gesture-gated surface',
    run: async (h) => {
      const { context, page } = await newContextPage(h)
      try {
        assert.equal(await page.getByLabel('Audio (optional)').count(), 0)
        assert.equal(await page.getByLabel('Microphone (optional)').count(), 0)
        await page.getByText('Audio & microphone', { exact: true }).click()
        await page.getByRole('button', { name: /^enable audio$/i }).waitFor({ state: 'visible' })
        assert.equal(await page.getByRole('button', { name: /enable microphone/i }).count(), 0)
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
        await waitForAppShell(page)
        await waitForAnimationFrames(page, 2)
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
