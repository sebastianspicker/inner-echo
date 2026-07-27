import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import {
  expectCameraStatus,
  installFakeMedia,
  newAppPage,
  startCamera,
} from '../../tests/e2e/support/browser.mjs'
import { captureShot, ensureDetailsOpen, revealInPanel } from './capture-support.mjs'

export async function captureOnboarding(harness, shot, outputDirectory) {
  const { context, page } = await newAppPage(harness, shot.viewport, false)
  try {
    await captureShot(page, outputDirectory, shot)
  } finally {
    await context.close()
  }
}

async function captureCollectionModes(page, shot, outputDirectory) {
  await page.getByRole('radio', { name: /^curated collections$/i }).check()
  const conditionPicker = page.locator('#condition-picker')
  await conditionPicker.waitFor({ state: 'attached', timeout: 3000 })
  await revealInPanel(conditionPicker)
  await delay(200)
  await captureShot(page, outputDirectory, shot('03-preset-mode'))

  await page.getByRole('radio', { name: /^combine collections$/i }).check()
  const multimorbid = page.locator('[aria-label="Combined curated collections"]')
  await multimorbid.waitFor({ state: 'visible', timeout: 3000 })
  const presetChecks = multimorbid.getByRole('checkbox')
  assert.ok((await presetChecks.count()) >= 2, 'Expected at least 2 multimorbid checkboxes')
  await presetChecks.nth(0).check()
  await presetChecks.nth(1).check()
  await revealInPanel(presetChecks.nth(0))
  await delay(220)
  await captureShot(page, outputDirectory, shot('04-multimorbid-mode'))

  await page.getByRole('radio', { name: /^experience dimensions$/i }).check()
  const symptom = page.locator('[aria-label="Experience dimensions"]')
  await symptom.waitFor({ state: 'visible', timeout: 3000 })
  const dimensionChecks = symptom.getByRole('checkbox')
  assert.ok((await dimensionChecks.count()) >= 2, 'Expected at least 2 symptom checkboxes')
  await dimensionChecks.nth(0).check()
  await dimensionChecks.nth(1).check()
  await revealInPanel(dimensionChecks.nth(0))
  await delay(220)
  await captureShot(page, outputDirectory, shot('05-symptom-mode'))
}

async function captureAudioAndSafety(page, shot, outputDirectory) {
  await ensureDetailsOpen(page, 'Audio & microphone')
  const enableAudioButton = page.getByRole('button', { name: /enable audio/i }).first()
  if (await enableAudioButton.isVisible()) await enableAudioButton.click()
  await page.waitForTimeout(250)
  await captureShot(page, outputDirectory, shot('06-audio-mic-controls'))

  await page
    .locator('.ie-header')
    .getByRole('button', { name: /evidence/i })
    .click()
  await page.locator('dialog.evidence-dialog').waitFor({ state: 'visible', timeout: 3000 })
  await delay(150)
  await captureShot(page, outputDirectory, shot('07-evidence-drawer'))
  await page.getByRole('button', { name: /^close$/i }).click()
  await page.locator('dialog.evidence-dialog').waitFor({ state: 'hidden', timeout: 3000 })
  await page.getByLabel('Safe Mode').check()
  await page.getByLabel('Reduced Motion').check()
  await delay(150)
  await captureShot(page, outputDirectory, shot('08-safety-toggles'))

  await page
    .getByRole('button', { name: /stop camera, microphone, sound, and effects/i })
    .click({ force: true })
  await expectCameraStatus(page, /ready/i, 3000)
  await page.evaluate(() => window.scrollTo(0, 0))
  await delay(200)
  await captureShot(page, outputDirectory, shot('10-stop-everything-idle'))
}

export async function captureDesktopWorkflow(harness, shot, outputDirectory) {
  const { context, page } = await newAppPage(harness, shot('02-hero-active').viewport)
  try {
    await installFakeMedia(page)
    await startCamera(page)
    await delay(300)
    await captureShot(page, outputDirectory, shot('02-hero-active'))
    await captureCollectionModes(page, shot, outputDirectory)
    await captureAudioAndSafety(page, shot, outputDirectory)
  } finally {
    await context.close()
  }
}

export async function captureMobileWorkflow(harness, shot, outputDirectory) {
  const { context, page } = await newAppPage(harness, shot('09-mobile-home-390x844').viewport)
  try {
    await installFakeMedia(page)
    await startCamera(page)
    await delay(250)
    await captureShot(page, outputDirectory, shot('09-mobile-home-390x844'))
  } finally {
    await context.close()
  }
}
