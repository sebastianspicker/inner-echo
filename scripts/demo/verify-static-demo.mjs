import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'

const root = resolve(import.meta.dirname, '../..')
const output = resolve(root, 'pages-dist')
const html = await readFile(resolve(output, 'index.html'), 'utf8')
const script = await readFile(resolve(output, 'demo.js'), 'utf8')
const dom = new JSDOM(html)

const failures = []
const document = dom.window.document

for (const path of [
  'demo.css',
  'demo.js',
  'assets/inner-echo-mark.svg',
  'assets/inner-echo-favicon.svg',
  'screenshots/01-onboarding.webp',
  'screenshots/05-symptom-mode.webp',
  'screenshots/02-hero-active.webp',
  'screenshots/10-stop-everything-idle.webp',
  '.nojekyll',
]) {
  try {
    await access(resolve(output, path))
  } catch {
    failures.push(`missing built asset: ${path}`)
  }
}

for (const button of document.querySelectorAll('button')) {
  if (!button.textContent?.includes('Simulated')) {
    failures.push(`button is not visibly marked as simulated: ${button.id || button.className}`)
  }
}

if (document.querySelector('video, audio, input')) {
  failures.push('demo contains a media element or input')
}

for (const forbiddenCapability of [
  'getUserMedia',
  'AudioContext',
  'localStorage',
  'sessionStorage',
]) {
  if (script.includes(forbiddenCapability)) {
    failures.push(`demo script contains forbidden runtime capability: ${forbiddenCapability}`)
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(
    'Static demo verification passed: assets exist, controls are marked, and runtime capabilities are absent.',
  )
}
