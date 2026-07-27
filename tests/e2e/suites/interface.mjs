import assert from 'node:assert/strict'
import { newFaviconPage, waitForAnimationFrames, withAppPage } from '../support/ui.mjs'
import { waitForAppShell } from '../support/browser.mjs'

async function verifyAudioControls(harness) {
  await withAppPage(harness, async (page) => {
    assert.equal(await page.getByLabel('Audio (optional)').count(), 0)
    assert.equal(await page.getByLabel('Microphone (optional)').count(), 0)
    await page.getByText('Audio & microphone', { exact: true }).click()
    await page.getByRole('button', { name: /^enable audio$/i }).waitFor({ state: 'visible' })
    assert.equal(await page.getByRole('button', { name: /enable microphone/i }).count(), 0)
  })
}

async function verifyDebugDefault(harness) {
  await withAppPage(harness, async (page) => {
    const result = await page.evaluate(() => {
      const checkbox = document.querySelector('input[aria-label="Debug overlay (dev)"]')
      const panel = document.querySelector('.debug-panel')
      return { hasToggle: !!checkbox, checked: !!checkbox?.checked, panelMounted: !!panel }
    })
    assert.equal(result.hasToggle, true, 'Debug toggle must be present in DEV UI')
    assert.equal(result.checked, false, 'Debug toggle must default to unchecked')
    assert.equal(result.panelMounted, false, 'Debug panel must not mount by default')
  })
}

async function verifyFaviconResponse(harness) {
  const { context, page } = await newFaviconPage(harness)
  try {
    let favicon404 = false
    page.on('response', (response) => {
      if (response.url().endsWith('/favicon.ico') && response.status() === 404) favicon404 = true
    })
    await page.goto(harness.baseUrl, { waitUntil: 'networkidle' })
    await waitForAppShell(page)
    await waitForAnimationFrames(page, 2)
    assert.equal(favicon404, false, 'Initial load should not produce favicon.ico 404')
  } finally {
    await context.close()
  }
}

async function verifyTouchTargets(harness) {
  await withAppPage(
    harness,
    async (page) => {
      const metrics = await page.evaluate(() => {
        const read = (selector) =>
          Array.from(document.querySelectorAll(selector)).map((element) => ({
            text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30),
            height: Math.round(element.getBoundingClientRect().height),
          }))
        return [...read('.ie-actions .ie-btn'), ...read('.composer__quick-buttons button')]
      })
      const tooSmall = metrics.filter((metric) => metric.height < 44)
      assert.equal(
        tooSmall.length,
        0,
        `Found controls below 44px: ${tooSmall.map((item) => `${item.text}:${item.height}`).join(', ')}`,
      )
    },
    { width: 390, height: 844 },
  )
}

export const interfaceTests = [
  {
    name: 'sound and microphone controls have one explicit gesture-gated surface',
    run: verifyAudioControls,
  },
  { name: 'debug overlay is off by default', run: verifyDebugDefault },
  { name: 'no missing favicon response on initial load', run: verifyFaviconResponse },
  { name: 'primary mobile controls meet 44px touch target height', run: verifyTouchTargets },
]
