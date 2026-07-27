import { setTimeout as delay } from 'node:timers/promises'
import { addOnboardingAcknowledgement, newAppPage, waitForAnimationFrames } from './browser.mjs'

export { newAppPage, waitForAnimationFrames }

export async function withAppPage(harness, run, viewport, onboardingAccepted = true) {
  const { context, page } = await newAppPage(harness, viewport, onboardingAccepted)
  try {
    await run(page)
  } finally {
    await context.close()
  }
}

export async function forceWebglUnavailable(page) {
  await page.evaluate(() => {
    const proto = HTMLCanvasElement.prototype
    if (!proto.__ieOrigGetContext) proto.__ieOrigGetContext = proto.getContext
    proto.getContext = function patchedGetContext(type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl', 'experimental-webgl2'].includes(type))
        return null
      return proto.__ieOrigGetContext.call(this, type, ...args)
    }
  })
}

async function readDebugValue(page, label) {
  return page.evaluate((targetLabel) => {
    const terms = Array.from(document.querySelectorAll('.debug-panel__grid dt'))
    const term = terms.find((item) => item.textContent?.trim().toLowerCase() === targetLabel)
    return term?.nextElementSibling?.textContent?.trim() ?? null
  }, label.toLowerCase())
}

export async function expectDebugValue(page, label, regex, timeoutMs) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const value = await readDebugValue(page, label)
    if (value && regex.test(value)) return
    await delay(100)
  }
  throw new Error(
    `Debug value ${label} did not match ${regex}; final="${await readDebugValue(page, label)}"`,
  )
}

export async function expectCanvasNonBlank(page, timeoutMs) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const stats = await page.evaluate(() => {
      const canvas = document.querySelector('.ie-canvas:not([hidden])')
      if (!canvas?.width || !canvas.height) return null
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return null
      const width = Math.min(canvas.width, 96)
      const height = Math.min(canvas.height, 72)
      const pixels = context.getImageData(0, 0, width, height).data
      const countNonBlankPixels = (data) => {
        let count = 0
        for (let index = 0; index < data.length; index += 4) {
          if (data[index] !== 0 || data[index + 1] !== 0 || data[index + 2] !== 0) count += 1
        }
        return count
      }
      return { nonBlank: countNonBlankPixels(pixels), total: pixels.length / 4 }
    })
    if (stats && stats.nonBlank > stats.total * 0.01) return
    await delay(100)
  }
  throw new Error('Fallback canvas did not produce nonblank 2D pixels')
}

export async function expectElementText(page, selector, regex, timeoutMs) {
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

function isDisallowedWebglConsole(type, text) {
  return (
    /THREE\.WebGLProgram|Shader Error|INVALID_OPERATION/i.test(text) ||
    (type === 'error' && /WebGL/i.test(text))
  )
}

export async function collectConsole(page, run) {
  const webglLike = []
  const onConsole = (message) => {
    const text = `${message.type().toUpperCase()} ${message.text()}`
    if (isDisallowedWebglConsole(message.type(), text)) webglLike.push(text)
  }
  page.on('console', onConsole)
  try {
    await run()
  } finally {
    page.off('console', onConsole)
  }
  return webglLike
}

export async function newFaviconPage(harness) {
  const context = await harness.browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()
  await addOnboardingAcknowledgement(page)
  return { context, page }
}
