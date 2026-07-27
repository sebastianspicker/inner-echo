import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import {
  collectConsole,
  expectElementText,
  withAppPage,
  waitForAnimationFrames,
} from '../support/ui.mjs'
import {
  ONBOARDING_KEY,
  expectCameraStatus,
  installFakeMedia,
  startCamera,
} from '../support/browser.mjs'

async function verifyFirstRun(harness) {
  await withAppPage(
    harness,
    async (page) => {
      const welcome = page.getByRole('heading', { name: /notice what shifts/i })
      await welcome.waitFor({ state: 'visible', timeout: 5000 })
      assert.equal(await page.getByRole('button', { name: /^start camera$/i }).count(), 0)
      await page.getByRole('button', { name: /continue to setup/i }).click()
      await welcome.waitFor({ state: 'hidden', timeout: 3000 })
      assert.equal(await page.getByRole('button', { name: /^start camera$/i }).isEnabled(), true)
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), ONBOARDING_KEY), 'true')
    },
    undefined,
    false,
  )
}

async function verifyComfortDefaults(harness) {
  const context = await harness.browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  try {
    await page.addInitScript((key) => localStorage.setItem(key, 'true'), ONBOARDING_KEY)
    await page.goto(harness.baseUrl, { waitUntil: 'networkidle' })
    await page
      .locator('section[aria-label="Inner Echo"]')
      .waitFor({ state: 'visible', timeout: 5000 })
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
}

async function verifySmallScreenStop(harness) {
  await withAppPage(
    harness,
    async (page) => {
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
    },
    { width: 320, height: 720 },
  )
}

async function verifyEvidenceDrawer(harness) {
  await withAppPage(harness, async (page) => {
    await page.getByRole('button', { name: /^open method and evidence$/i }).click()
    await page.locator('dialog.evidence-dialog').waitFor({ state: 'visible', timeout: 5000 })
    await expectElementText(page, '#evidence-title', /method & evidence/i, 5000)
    await expectElementText(page, '.evidence-content', /non-diagnostic disclaimer/i, 5000)
    await page.getByRole('button', { name: /^close$/i }).click()
    await page.getByLabel('Curated collections').check()
    await page.locator('#condition-picker').selectOption('anxiety')
    await page
      .getByRole('button', {
        name: /^open evidence doc docs\/references\/conditions\/anxiety\.md$/i,
      })
      .click()
    await expectElementText(page, '#evidence-title', /method & evidence/i, 5000)
    await expectElementText(page, '.evidence-content', /condition preset.*anxiety/i, 5000)
  })
}

async function verifyRapidConditionSwitching(harness) {
  await withAppPage(harness, async (page) => {
    await installFakeMedia(page)
    await page.getByRole('radio', { name: /^curated collections$/i }).check()
    await startCamera(page)
    const webglLike = await collectConsole(page, async () => {
      await page.evaluate(async () => {
        const select = document.querySelector('#condition-picker')
        if (!select) throw new Error('condition picker not found')
        for (let round = 0; round < 3; round += 1) {
          for (const value of Array.from(select.options).map((option) => option.value)) {
            select.value = value
            select.dispatchEvent(new Event('change', { bubbles: true }))
            await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
          }
        }
      })
      await waitForAnimationFrames(page, 8)
    })
    assert.equal(
      webglLike.length,
      0,
      `Expected no WebGL/shader console noise, got ${webglLike.join('\n')}`,
    )
  })
}

export const foundationTests = [
  {
    name: 'first-run welcome separates disclosure, setup, and camera activation',
    run: verifyFirstRun,
  },
  {
    name: 'comfort defaults inherit system reduced motion without starting media',
    run: verifyComfortDefaults,
  },
  {
    name: 'stop remains reachable after inactivity at 320px without horizontal overflow',
    run: verifySmallScreenStop,
  },
  {
    name: 'evidence drawer opens from header and condition evidence buttons',
    run: verifyEvidenceDrawer,
  },
  {
    name: 'no WebGL/shader errors during rapid condition switching',
    run: verifyRapidConditionSwitching,
  },
]
