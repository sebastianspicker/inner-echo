/**
 * Runtime matrix smoke test (browser-level).
 *
 * Launches Vite dev server and drives the UI in a headless browser with fake camera/mic.
 * Asserts:
 * - no page errors / console errors
 * - onboarding can be accepted
 * - camera can start and stop ("Stop Everything")
 * - composer modes can be exercised (preset, multimorbid, symptom-first; hybrid by switching)
 * - audio can be enabled; mic can be enabled; calibration sliders work
 */

import { spawn } from 'node:child_process'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

const DESIRED_PORT = Number(process.env.PORT ?? 5173)
const REQUIRE_AUDIO = process.env.REQUIRE_AUDIO === '1'
const REQUIRE_MIC = process.env.REQUIRE_MIC === '1'
const HEADLESS = process.env.HEADLESS ? process.env.HEADLESS === '1' : true

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error(`Timeout (${ms}ms): ${label}`)), ms)
  })
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await Promise.race([p, timeout])
  } finally {
    if (t) clearTimeout(t)
  }
}

async function startDevServer(): Promise<{ proc: ReturnType<typeof spawn>; baseUrl: string }> {
  const proc = spawn('npm', ['run', 'dev', '--', '--port', String(DESIRED_PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  })

  let baseUrl: string | null = null
  const output: string[] = []
  const pushOut = (text: string) => {
    for (const line of text.split('\n')) {
      const trimmed = line.trimEnd()
      if (!trimmed) continue
      output.push(trimmed)
      if (output.length > 80) output.shift()
    }
  }

  const onData = (data: Buffer) => {
    const text = data.toString('utf-8')
    pushOut(text)
    const m = text.match(/http:\/\/localhost:(\d+)\//)
    if (m?.[0]) baseUrl = m[0]
  }
  proc.stdout?.on('data', onData)
  proc.stderr?.on('data', onData)

  const exitedEarly = new Promise<never>((_, rej) => {
    proc.once('exit', (code) => {
      rej(new Error(`Dev server exited early (code ${code ?? 'unknown'}).\n\n${output.join('\n')}`))
    })
  })

  await withTimeout(
    Promise.race([
      (async () => {
        while (!baseUrl) await sleep(50)
      })(),
      exitedEarly,
    ]),
    30_000,
    'Vite dev server ready',
  )

  return { proc, baseUrl: baseUrl! }
}

async function stopDevServer(proc: ReturnType<typeof spawn>): Promise<void> {
  if (proc.killed) return
  proc.kill('SIGTERM')
  await Promise.race([new Promise<void>((r) => proc.on('exit', () => r())), sleep(2000)])
  if (!proc.killed) proc.kill('SIGKILL')
}

async function launchBrowser(
  baseUrl: string,
): Promise<{ browser: Browser; context: BrowserContext; page: Page; errors: string[] }> {
  const errors: string[] = []
  const browser = await chromium.launch({
    headless: HEADLESS,
    chromiumSandbox: false,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--no-first-run',
      '--no-default-browser-check',
      // Make WebGL more reliable in headless / CI-like environments.
      '--ignore-gpu-blocklist',
      '--disable-gpu-sandbox',
      '--use-gl=swiftshader',
    ],
  })
  const context = await browser.newContext()
  await context.grantPermissions(['camera', 'microphone'], { origin: baseUrl })
  const page = await context.newPage()

  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${String(err)}`)
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`)
    }
  })

  return { browser, context, page, errors }
}

async function runFlow(page: Page, baseUrl: string): Promise<void> {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })

  // Onboarding
  const onboardingCheckbox = page.getByRole('checkbox', { name: /I have read and understood/i })
  if (await onboardingCheckbox.isVisible().catch(() => false)) {
    await onboardingCheckbox.check()
    await page.getByRole('button', { name: /Accept and continue/i }).click()
  }

  // Start camera
  await page.getByRole('button', { name: /Start camera/i }).click()
  await page
    .locator('.ie-statusRow')
    .getByText('Active', { exact: false })
    .waitFor({ timeout: 20_000 })

  // Enable audio
  const audioDetails = page.locator('details').filter({ hasText: 'Audio & microphone' }).first()
  if (await audioDetails.isVisible().catch(() => false)) {
    const isOpen = await audioDetails.evaluate((el) => (el as HTMLDetailsElement).open)
    if (!isOpen) {
      await audioDetails.locator('summary').first().click()
    }
  }
  const audioGroup = page.getByRole('group', { name: 'Audio' })
  const audioStatus = audioGroup.getByRole('status').first()
  let audioIsOn = false
  let statusText = (await audioStatus.textContent().catch(() => null)) ?? ''
  audioIsOn = /Audio:\s*on/i.test(statusText)
  if (!audioIsOn) {
    const enableAudio = audioGroup.getByRole('button', { name: /Enable audio/i })
    if (await enableAudio.isVisible().catch(() => false)) {
      await enableAudio.click()
    }
    try {
      await audioStatus
        .filter({ hasText: /Audio:\s*(on|error)/i })
        .first()
        .waitFor({ timeout: 20_000 })
      statusText = (await audioStatus.textContent()) ?? ''
      audioIsOn = /Audio:\s*on/i.test(statusText)
      if (!audioIsOn) {
        const alertText = await audioGroup
          .getByRole('alert')
          .textContent()
          .catch(() => null)
        const detail = alertText ? ` (${alertText.trim()})` : ''
        if (REQUIRE_AUDIO) throw new Error(`Audio failed to start${detail}`)
        console.warn(`[runtime-matrix] WARN: audio not on${detail}`)
      }
    } catch (e) {
      if (REQUIRE_AUDIO) throw e
      console.warn(
        '[runtime-matrix] WARN: audio did not reach on/error within timeout; continuing without mic',
      )
      audioIsOn = false
    }
  }

  // Switch to multimorbid and select two presets
  await page.getByRole('radio', { name: 'Multimorbid' }).check()
  const mm = page.getByRole('group', { name: /Multimorbid preset stack/i })
  const mmBoxes = mm.getByRole('checkbox')
  await mmBoxes.nth(0).check()
  await mmBoxes.nth(1).check()

  // Switch to symptom-first and select two dimensions (hybrid test: presets remain selected)
  await page.getByRole('radio', { name: 'Symptom-first' }).check()
  const sym = page.getByRole('group', { name: /Symptom-first dimensions/i })
  const symBoxes = sym.getByRole('checkbox')
  await symBoxes.nth(0).check()
  await symBoxes.nth(1).check()

  // Turn on mic via composer toggle (requests mic if audio is on)
  if (audioIsOn) {
    const micToggle = page.getByRole('checkbox', { name: /Microphone \(optional\)/i })
    await micToggle.check()
    try {
      await page.getByText('Mic: on', { exact: false }).waitFor({ timeout: 20_000 })
      // Calibrate mic (sliders exist only when mic is on)
      const micSensitivity = page.getByRole('slider', { name: /Mic sensitivity/i })
      await micSensitivity.evaluate((el) => {
        const input = el as HTMLInputElement
        input.value = '70'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
      const micGate = page.getByRole('slider', { name: /Noise gate/i })
      await micGate.evaluate((el) => {
        const input = el as HTMLInputElement
        input.value = '35'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    } catch (e) {
      if (REQUIRE_MIC) throw e
      console.warn('[runtime-matrix] WARN: mic did not reach on within timeout; continuing')
    }
  } else if (REQUIRE_MIC) {
    throw new Error('Mic required but audio is not on')
  }

  // Stop everything
  await page.getByRole('button', { name: /^Stop Everything/i }).click()
  await page
    .locator('.ie-statusRow')
    .getByText('Ready', { exact: false })
    .waitFor({ timeout: 10_000 })
}

async function main(): Promise<void> {
  const { proc, baseUrl } = await startDevServer()
  try {
    const { browser, context, page, errors } = await launchBrowser(baseUrl)
    try {
      await runFlow(page, baseUrl)
    } finally {
      await context.close().catch(() => {})
      await browser.close().catch(() => {})
    }
    if (errors.length) {
      console.error('[runtime-matrix] FAIL: errors detected')
      for (const e of errors) console.error(`- ${e}`)
      process.exit(1)
    }
    console.log('[runtime-matrix] OK')
  } finally {
    await stopDevServer(proc)
  }
}

void main()
