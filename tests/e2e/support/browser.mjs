import { setTimeout as delay } from 'node:timers/promises'

export const ONBOARDING_KEY = 'inner-echo-welcome-acknowledged-v2'

export async function waitForAppShell(page, onboardingAccepted = true) {
  await page
    .locator('section[aria-label="Inner Echo"]')
    .waitFor({ state: 'visible', timeout: 5000 })
  if (!onboardingAccepted) {
    await page.getByRole('heading', { name: /notice what shifts/i }).waitFor({ timeout: 5000 })
    return
  }
  await page.getByRole('banner').waitFor({ state: 'visible', timeout: 5000 })
  await page
    .getByRole('status', { name: 'Runtime status' })
    .waitFor({ state: 'visible', timeout: 5000 })
}

export async function addOnboardingAcknowledgement(page) {
  await page.addInitScript((key) => {
    try {
      localStorage.setItem(key, 'true')
    } catch {
      // Local storage can be unavailable in restricted browser contexts.
    }
  }, ONBOARDING_KEY)
}

export async function newAppPage(harness, viewport, onboardingAccepted = true) {
  const context = await harness.browser.newContext({ viewport })
  const page = await context.newPage()
  if (onboardingAccepted) await addOnboardingAcknowledgement(page)
  await page.goto(harness.baseUrl, { waitUntil: 'networkidle' })
  await waitForAppShell(page, onboardingAccepted)
  return { context, page }
}

export async function waitForAnimationFrames(page, frameCount = 2) {
  await page.evaluate(
    (count) =>
      new Promise((resolve) => {
        let remaining = count
        const step = () => {
          remaining -= 1
          if (remaining <= 0) return resolve(null)
          requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }),
    frameCount,
  )
}

export async function readCameraStatus(page) {
  return page.evaluate(() => {
    const pills = Array.from(document.querySelectorAll('.ie-statusRow .ie-pill'))
    const cameraPill = pills.find(
      (pill) => pill.querySelector('.ie-pillKey')?.textContent?.trim().toLowerCase() === 'camera',
    )
    const status = cameraPill?.querySelector('.ie-pillVal')?.textContent?.trim()
    if (!status) throw new Error('Camera status pill not found')
    return status
  })
}

export async function expectCameraStatus(page, regex, timeoutMs) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (regex.test(await readCameraStatus(page))) return
    await delay(100)
  }
  throw new Error(`Camera status did not match ${regex}; final="${await readCameraStatus(page)}"`)
}

export async function startCamera(page) {
  await page.getByRole('button', { name: /^start camera$/i }).click()
  await expectCameraStatus(page, /active/i, 3000)
}

export async function installFakeMedia(page, micDeniedMessage = 'Mic denied in e2e') {
  await page.evaluate((deniedMessage) => {
    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices) return
    const w = window
    if (!w.__ieOrigGetUserMedia)
      w.__ieOrigGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices)
    if (!w.__ieE2eCanvas) {
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const context = canvas.getContext('2d')
      let time = 0
      const draw = () => {
        if (!context) return
        time += 0.03
        context.fillStyle = '#101827'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.fillStyle = '#7bc8c0'
        context.fillRect((Math.sin(time) * 0.4 + 0.5) * (canvas.width - 140), 170, 140, 100)
        context.fillStyle = '#c7d2fe'
        context.font = '20px sans-serif'
        context.fillText('inner-echo e2e cam', 16, 32)
        w.__ieE2eRaf = requestAnimationFrame(draw)
      }
      draw()
      w.__ieE2eCanvas = canvas
    }
    mediaDevices.getUserMedia = async (constraints) => {
      if (constraints.video) return w.__ieE2eCanvas.captureStream(30)
      if (constraints.audio) throw new DOMException(deniedMessage, 'NotAllowedError')
      return w.__ieOrigGetUserMedia(constraints)
    }
  }, micDeniedMessage)
}
