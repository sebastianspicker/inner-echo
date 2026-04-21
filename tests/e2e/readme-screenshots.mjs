import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const ROOT = process.cwd()
const HOST = '127.0.0.1'
const PORT = 4173
const BASE_URL = `http://${HOST}:${PORT}`
const ONBOARDING_KEY = 'inner-echo-onboarding-accepted'
const MANIFEST_PATH = path.join(ROOT, 'assets/readme/screenshots/manifest.json')
const PNG_DIR = path.join(ROOT, 'assets/readme/screenshots/png')

async function readManifest() {
  const raw = await fs.readFile(MANIFEST_PATH, 'utf8')
  const parsed = JSON.parse(raw)
  if (!parsed || !Array.isArray(parsed.shots)) {
    throw new Error('Invalid screenshot manifest: missing shots array')
  }
  return parsed
}

async function ensureDirs() {
  await fs.mkdir(PNG_DIR, { recursive: true })
}

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
    cwd: ROOT,
    stdio: 'pipe',
    env: process.env,
  })
}

async function stopServer(proc) {
  if (!proc || proc.killed || proc.exitCode != null) return
  proc.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => proc.once('exit', () => resolve())),
    delay(3000).then(() => {
      if (!proc.killed && proc.exitCode == null) proc.kill('SIGKILL')
    }),
  ])
}

async function createHarness() {
  let ownsServer = false
  let serverProc = null

  if (!(await isServerUp())) {
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

async function destroyHarness(harness) {
  await harness.browser.close()
  if (harness.ownsServer) {
    await stopServer(harness.serverProc)
  }
}

async function newContextPage(harness, viewport, onboardingAccepted) {
  const context = await harness.browser.newContext({ viewport })
  const page = await context.newPage()

  if (onboardingAccepted) {
    await page.addInitScript((key) => {
      try {
        localStorage.setItem(key, 'true')
      } catch {
        // ignore localStorage failures
      }
    }, ONBOARDING_KEY)
  }

  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await waitForAppShell(page)
  return { context, page }
}

async function waitForAppShell(page) {
  await page
    .locator('section[aria-label="Inner Echo — camera and controls"]')
    .waitFor({ state: 'visible', timeout: 5000 })
  await page.getByRole('banner').waitFor({ state: 'visible', timeout: 5000 })
  await page
    .getByRole('status', { name: 'Runtime status' })
    .waitFor({ state: 'visible', timeout: 5000 })
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
        ctx.fillText('inner-echo synthetic camera', 16, 32)
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
        throw new DOMException('Mic denied in README screenshot harness', 'NotAllowedError')
      }
      return w.__ieOrigGetUserMedia(constraints)
    }
  })
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

async function ensureDetailsOpen(page, summaryText) {
  const summary = page.locator(`summary:has-text("${summaryText}")`).first()
  await summary.scrollIntoViewIfNeeded()
  const isOpen = await summary.evaluate(
    (el) => el.closest('details')?.hasAttribute('open') ?? false,
  )
  if (!isOpen) {
    await summary.click()
  }
}

async function captureShot(page, shot) {
  const outputPath = path.join(PNG_DIR, `${shot.baseName}.png`)
  await page.screenshot({ path: outputPath, fullPage: false })
  const stat = await fs.stat(outputPath)
  if (!stat.isFile() || stat.size <= 0) {
    throw new Error(`Failed to create screenshot: ${outputPath}`)
  }
  console.log(`[screenshots:capture] ${shot.id}`)
}

async function main() {
  const manifest = await readManifest()
  if (manifest.shots.length !== 10) {
    throw new Error(`Expected 10 shots in manifest, found ${manifest.shots.length}`)
  }

  const byId = new Map(manifest.shots.map((shot) => [shot.id, shot]))
  const shot = (id) => {
    const entry = byId.get(id)
    if (!entry) throw new Error(`Shot missing from manifest: ${id}`)
    return entry
  }

  await ensureDirs()
  const harness = await createHarness()

  try {
    const desktopViewport = shot('01-onboarding').viewport
    const onboardingCtx = await newContextPage(harness, desktopViewport, false)
    try {
      await captureShot(onboardingCtx.page, shot('01-onboarding'))
    } finally {
      await onboardingCtx.context.close()
    }

    const desktopCtx = await newContextPage(harness, shot('02-hero-active').viewport, true)
    try {
      const { page } = desktopCtx
      await installFakeMedia(page)
      await page.getByRole('button', { name: /^start camera$/i }).click()
      await expectCameraStatus(page, /active/i, 3000)
      await delay(300)

      await captureShot(page, shot('02-hero-active'))

      await page.getByRole('radio', { name: /^preset$/i }).check()
      await page.locator('#condition-picker').waitFor({ state: 'visible', timeout: 3000 })
      await delay(200)
      await captureShot(page, shot('03-preset-mode'))

      await page.getByRole('radio', { name: /^multimorbid$/i }).check()
      const multimorbid = page.locator('[aria-label="Multimorbid preset stack"]')
      await multimorbid.waitFor({ state: 'visible', timeout: 3000 })
      const presetChecks = multimorbid.getByRole('checkbox')
      const presetCount = await presetChecks.count()
      assert.ok(presetCount >= 2, `Expected at least 2 multimorbid checkboxes, got ${presetCount}`)
      await presetChecks.nth(0).check()
      await presetChecks.nth(1).check()
      await delay(220)
      await captureShot(page, shot('04-multimorbid-mode'))

      await page.getByRole('radio', { name: /^symptom-first$/i }).check()
      const symptom = page.locator('[aria-label="Symptom-first dimensions"]')
      await symptom.waitFor({ state: 'visible', timeout: 3000 })
      const dimChecks = symptom.getByRole('checkbox')
      const dimCount = await dimChecks.count()
      assert.ok(dimCount >= 2, `Expected at least 2 symptom checkboxes, got ${dimCount}`)
      await dimChecks.nth(0).check()
      await dimChecks.nth(1).check()
      await delay(220)
      await captureShot(page, shot('05-symptom-mode'))

      await ensureDetailsOpen(page, 'Audio & microphone')
      const enableAudioButton = page.getByRole('button', { name: /enable audio/i }).first()
      if (await enableAudioButton.isVisible()) {
        await enableAudioButton.click()
      }
      await page.waitForTimeout(250)
      await captureShot(page, shot('06-audio-mic-controls'))

      await page
        .locator('.ie-header')
        .getByRole('button', { name: /evidence/i })
        .click()
      await page.locator('.evidence-backdrop').waitFor({ state: 'visible', timeout: 3000 })
      await delay(150)
      await captureShot(page, shot('07-evidence-drawer'))

      await page.getByRole('button', { name: /close evidence viewer/i }).click()
      await page.locator('.evidence-backdrop').waitFor({ state: 'hidden', timeout: 3000 })
      const composer = page.locator('.composer')
      await composer.getByLabel('Safe Mode').first().check()
      await composer.getByLabel('Reduced Motion').first().check()
      await delay(150)
      await captureShot(page, shot('08-safety-toggles'))

      await page
        .locator('.ie-header')
        .getByRole('button', { name: /stop everything/i })
        .click()
      await expectCameraStatus(page, /ready/i, 3000)
      await delay(200)
      await captureShot(page, shot('10-stop-everything-idle'))
    } finally {
      await desktopCtx.context.close()
    }

    const mobileCtx = await newContextPage(harness, shot('09-mobile-home-390x844').viewport, true)
    try {
      const { page } = mobileCtx
      await installFakeMedia(page)
      await page.getByRole('button', { name: /^start camera$/i }).click()
      await expectCameraStatus(page, /active/i, 3000)
      await delay(250)
      await captureShot(page, shot('09-mobile-home-390x844'))
    } finally {
      await mobileCtx.context.close()
    }

    console.log(`[screenshots:capture] OK (${manifest.shots.length} files)`)
  } finally {
    await destroyHarness(harness)
  }
}

main().catch((err) => {
  console.error(`[screenshots:capture] FAILED: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
