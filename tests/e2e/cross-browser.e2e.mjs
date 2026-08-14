import assert from 'node:assert/strict'
import { chromium, firefox, webkit } from 'playwright'
import {
  addOnboardingAcknowledgement,
  expectCameraStatus,
  installFakeMedia,
  waitForAnimationFrames,
  waitForAppShell,
} from './support/browser.mjs'
import { createDevServerHarness, destroyServerHarness } from './support/server.mjs'

const HOST = process.env.HOST ?? '127.0.0.1'
const PORT = Number(process.env.PORT ?? '4173')
const BASE_PATH = process.env.BASE_PATH ?? '/'
const BASE_URL = new URL(BASE_PATH, `http://${HOST}:${PORT}`).href
const DEMO_URL = process.env.DEMO_PATH ? new URL(process.env.DEMO_PATH, BASE_URL).href : null

const BROWSERS = [
  { name: 'chrome', launcher: chromium, launchOptions: { channel: 'chrome' } },
  { name: 'firefox', launcher: firefox, launchOptions: {} },
  { name: 'webkit', launcher: webkit, launchOptions: {} },
]

async function createHarness() {
  return createDevServerHarness(BASE_URL, HOST, PORT)
}

async function destroyHarness(h) {
  await destroyServerHarness(h)
}

async function newContextPage(browser, viewport = { width: 1280, height: 720 }) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await addOnboardingAcknowledgement(page)
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await waitForAppShell(page)
  return { context, page }
}

function isAllowedFirefoxWebglFallback(browserName, type, text) {
  return (
    browserName === 'firefox' &&
    type === 'error' &&
    /THREE\.WebGLRenderer: (A WebGL context could not be created|Error creating WebGL context\.)|AllowWebgl2:false restricts context creation|\[inner-echo\] WebGL pipeline startup failed Error/i.test(
      text,
    )
  )
}

function isDisallowedConsole(browserName, type, text) {
  if (isAllowedFirefoxWebglFallback(browserName, type, text)) return false
  return (
    type === 'error' ||
    /THREE\.WebGLProgram|Shader Error|INVALID_OPERATION|TypeError|ReferenceError/i.test(text)
  )
}

async function runSmoke(browserName, browser) {
  const { context, page } = await newContextPage(browser)
  const disallowedConsole = []
  const onConsole = (msg) => {
    const text = msg.text()
    if (isDisallowedConsole(browserName, msg.type(), text)) {
      disallowedConsole.push(`${msg.type().toUpperCase()} ${text}`)
    }
  }
  page.on('console', onConsole)
  try {
    await installFakeMedia(page, 'Mic denied in cross-browser e2e')
    await page.getByRole('radio', { name: /^curated collections$/i }).check()
    await page.getByRole('button', { name: /^start camera$/i }).click()
    await expectCameraStatus(page, /active/i, 3000)

    await page.evaluate(async () => {
      const select = document.querySelector('#condition-picker')
      if (!select) throw new Error('condition picker not found')
      const values = Array.from(select.options)
        .map((o) => o.value)
        .slice(0, 4)
      for (const value of values) {
        select.value = value
        select.dispatchEvent(new Event('change', { bubbles: true }))
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
      }
    })
    await waitForAnimationFrames(page, 4)
    await page.getByRole('button', { name: /stop everything/i }).click()
    await expectCameraStatus(page, /ready/i, 3000)

    assert.equal(
      disallowedConsole.length,
      0,
      `${browserName}: disallowed console output detected\n${disallowedConsole.join('\n')}`,
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
      `${browserName}: controls below 44px touch target: ${tooSmall.map((x) => `${x.text}:${x.h}`).join(', ')}`,
    )
  } finally {
    await mobile.context.close()
  }
}

async function runDemoSmoke(browserName, browser) {
  if (!DEMO_URL) return

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const failures = []
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => failures.push(`page: ${error.message}`))
  page.on('requestfailed', (request) => {
    failures.push(`request: ${request.url()} ${request.failure()?.errorText ?? 'failed'}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`response: ${response.status()} ${response.url()}`)
  })

  try {
    const response = await page.goto(DEMO_URL, { waitUntil: 'networkidle' })
    assert.equal(response?.ok(), true, `${browserName}: static demo navigation failed`)
    assert.match(await page.title(), /Static demo/i, `${browserName}: static demo title missing`)
    assert.equal(
      await page.locator('video, audio, input').count(),
      0,
      `${browserName}: static demo exposed a runtime media element or input`,
    )

    await page.getByRole('button', { name: /next.*simulated/i }).click()
    assert.match(
      (await page.getByRole('status').textContent()) ?? '',
      /step 2/i,
      `${browserName}: static demo interaction did not advance`,
    )
    assert.equal(
      failures.length,
      0,
      `${browserName}: static demo emitted browser failures\n${failures.join('\n')}`,
    )
  } finally {
    await context.close()
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
        await runDemoSmoke(name, browser)
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
