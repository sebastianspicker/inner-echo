import { chromium } from 'playwright'
import { createDevServerHarness, destroyServerHarness } from './support/server.mjs'
import { foundationTests } from './suites/foundation.mjs'
import { interfaceTests } from './suites/interface.mjs'
import { renderTests } from './suites/rendering.mjs'

const host = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.PORT ?? '4173')
const baseUrl = `http://${host}:${port}`

async function launchChromium() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("Executable doesn't exist")) {
      throw new Error(
        'Chrome is not available for Playwright. Run `npm run browsers:install` and retry.',
      )
    }
    throw error
  }
}

async function createHarness() {
  const server = await createDevServerHarness(baseUrl, host, port)
  const browser = await launchChromium()
  return { browser, baseUrl, ...server }
}

async function runTests(harness, tests) {
  const failures = []
  for (const test of tests) {
    const started = Date.now()
    try {
      await test.run(harness)
      console.log(`PASS ${test.name} (${Date.now() - started}ms)`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${test.name}: ${message}`)
      console.error(`FAIL ${test.name}: ${message}`)
    }
  }
  return failures
}

function reportFailures(failures) {
  if (failures.length === 0) return
  console.error('\nE2E failures:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
}

async function main() {
  const harness = await createHarness()
  try {
    reportFailures(await runTests(harness, [...foundationTests, ...renderTests, ...interfaceTests]))
  } finally {
    await harness.browser.close()
    await destroyServerHarness(harness)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
