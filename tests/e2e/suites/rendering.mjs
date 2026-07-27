import assert from 'node:assert/strict'
import {
  collectConsole,
  expectCanvasNonBlank,
  expectDebugValue,
  forceWebglUnavailable,
  withAppPage,
  waitForAnimationFrames,
} from '../support/ui.mjs'
import { expectCameraStatus, installFakeMedia, startCamera } from '../support/browser.mjs'

async function enableDebugOverlay(page) {
  await page.locator('input[aria-label="Debug overlay (dev)"]').check()
}

async function verifyCanvasFallback(harness) {
  await withAppPage(harness, async (page) => {
    await forceWebglUnavailable(page)
    await installFakeMedia(page)
    await startCamera(page)
    await enableDebugOverlay(page)
    await expectDebugValue(page, 'renderer', /^2d$/i, 3000)
    await waitForAnimationFrames(page, 4)
    await expectCanvasNonBlank(page, 3000)
  })
}

async function verifyContextLoss(harness) {
  await withAppPage(harness, async (page) => {
    await installFakeMedia(page)
    await startCamera(page)
    await enableDebugOverlay(page)
    await expectDebugValue(page, 'renderer', /^webgl$/i, 3000)
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      if (!canvas) throw new Error('overlay canvas not found')
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    })
    await expectDebugValue(page, 'renderer', /^2d$/i, 3000)
  })
}

async function selectTwoItems(container, expectedCount, weight) {
  const checks = container.getByRole('checkbox')
  assert.ok((await checks.count()) >= 2, expectedCount)
  await checks.nth(0).check()
  await checks.nth(1).check()
  const weights = container.locator('input[type="range"]')
  if ((await weights.count()) > 0) await weights.first().fill(weight)
}

async function transitionComposerModes(page) {
  await page.getByRole('radio', { name: /^combine collections$/i }).check()
  const multimorbid = page.locator('[aria-label="Combined curated collections"]')
  await multimorbid.waitFor({ state: 'visible', timeout: 3000 })
  await selectTwoItems(multimorbid, 'Expected at least 2 multimorbid preset checkboxes', '0.71')
  await waitForAnimationFrames(page, 2)

  await page.getByRole('radio', { name: /^experience dimensions$/i }).check()
  const symptom = page.locator('[aria-label="Experience dimensions"]')
  await symptom.waitFor({ state: 'visible', timeout: 3000 })
  await selectTwoItems(symptom, 'Expected at least 2 symptom dimension checkboxes', '0.63')
  await waitForAnimationFrames(page, 2)
  assert.ok(
    (await symptom.locator('.composer__summary li').count()) >= 1,
    'Expected symptom summary',
  )
}

async function verifyComposerTransitions(harness) {
  await withAppPage(harness, async (page) => {
    await installFakeMedia(page)
    await startCamera(page)
    const webglLike = await collectConsole(page, async () => {
      await transitionComposerModes(page)
      await page.getByRole('radio', { name: /^curated collections$/i }).check()
      await page.locator('#condition-picker').waitFor({ state: 'visible', timeout: 3000 })
      await waitForAnimationFrames(page, 4)
      await page.getByRole('button', { name: /stop everything/i }).click()
      await expectCameraStatus(page, /ready/i, 3000)
    })
    assert.equal(
      webglLike.length,
      0,
      `Expected no WebGL/shader console noise, got ${webglLike.join('\n')}`,
    )
  })
}

async function verifyTrackEndedState(harness) {
  await withAppPage(harness, async (page) => {
    await installFakeMedia(page)
    await startCamera(page)
    await page.evaluate(() => {
      const stream = document.querySelector('video')?.srcObject
      if (stream instanceof MediaStream) stream.getVideoTracks()[0]?.stop()
    })
    await expectCameraStatus(page, /camera error/i, 3000)
  })
}

async function verifyStopDoesNotError(harness) {
  await withAppPage(harness, async (page) => {
    await installFakeMedia(page)
    await startCamera(page)
    await page.getByRole('button', { name: /stop everything/i }).click()
    await expectCameraStatus(page, /ready/i, 3000)
    const errorCallout = await page
      .locator('.ie-callout.ie-callout--error[aria-label="Camera notice"]')
      .isVisible()
      .catch(() => false)
    assert.equal(errorCallout, false, 'Stop Everything should not surface interruption error state')
  })
}

export const renderTests = [
  {
    name: 'forced WebGL unavailable falls back to nonblank Canvas2D output',
    run: verifyCanvasFallback,
  },
  {
    name: 'WebGL context loss reports 2D preview instead of active effects',
    run: verifyContextLoss,
  },
  {
    name: 'multimorbid and symptom mode transitions remain stable with active camera',
    run: verifyComposerTransitions,
  },
  { name: 'camera state downgrades after active track ends', run: verifyTrackEndedState },
  {
    name: 'stop everything returns idle camera state without interruption error callout',
    run: verifyStopDoesNotError,
  },
]
