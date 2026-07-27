import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { newAppPage } from '../../tests/e2e/support/browser.mjs'
import {
  createPreviewServerHarness,
  destroyServerHarness,
} from '../../tests/e2e/support/server.mjs'
import { readScreenshotManifest, screenshotById } from './capture-support.mjs'
import {
  captureDesktopWorkflow,
  captureMobileWorkflow,
  captureOnboarding,
} from './capture-workflows.mjs'

const root = process.cwd()
const host = '127.0.0.1'
const port = 4173
const baseUrl = `http://${host}:${port}`
const manifestPath = path.join(root, 'assets/readme/screenshots/manifest.json')
const pngDirectory = path.join(root, 'assets/readme/screenshots/png')

async function createHarness() {
  const server = await createPreviewServerHarness(baseUrl, host, port)
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  return { browser, baseUrl, ...server }
}

async function destroyHarness(harness) {
  await harness.browser.close()
  await destroyServerHarness(harness)
}

async function main() {
  const manifest = await readScreenshotManifest(manifestPath)
  const shot = screenshotById(manifest)
  await fs.mkdir(pngDirectory, { recursive: true })
  const harness = await createHarness()
  try {
    await captureOnboarding(harness, shot('01-onboarding'), pngDirectory)
    await captureDesktopWorkflow(harness, shot, pngDirectory)
    await captureMobileWorkflow(harness, shot, pngDirectory)
    console.log(`[screenshots:capture] OK (${manifest.shots.length} files)`)
  } finally {
    await destroyHarness(harness)
  }
}

main().catch((error) => {
  console.error(
    `[screenshots:capture] FAILED: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exit(1)
})
