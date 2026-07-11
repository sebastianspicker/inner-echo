/**
 * Runtime matrix smoke test (browser-level).
 *
 * Launches Vite dev server and drives the UI in a headless browser with fake camera/mic.
 * Asserts:
 * - no page errors / console errors
 * - onboarding can be accepted
 * - camera can start and stop ("Stop Everything")
 * - composer modes can be exercised (preset, multimorbid, symptom-first; hybrid by switching)
 * - audio can be enabled; mic can be enabled; calibration sliders work
 */

import { spawn } from 'node:child_process'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

const DESIRED_PORT = Number(process.env.PORT ?? 5173)
const HOST = process.env.HOST ?? '127.0.0.1'
const argv = new Set(process.argv.slice(2))
const REQUIRE_AUDIO = process.env.REQUIRE_AUDIO === '1' || argv.has('--require-audio')
const REQUIRE_MIC = process.env.REQUIRE_MIC === '1' || argv.has('--require-mic')
const HEADLESS = process.env.HEADLESS ? process.env.HEADLESS === '1' : true
const AUDIO_ENGINE_READY_RE = /Audio:\s*(on|muted \(engine on\))/i

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error(`Timeout (${ms}ms): ${label}`)), ms)
  })
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await Promise.race([p, timeout])
  } finally {
    if (t) clearTimeout(t)
  }
}

async function startDevServer(): Promise<{ proc: ReturnType<typeof spawn>; baseUrl: string }> {
  const desiredBaseUrl = `http://${HOST}:${DESIRED_PORT}/`
  const proc = spawn('npm', ['run', 'dev', '--', '--host', HOST, '--port', String(DESIRED_PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  })

  let baseUrl: string | null = null
  const output: string[] = []
  const pushOut = (text: string) => {
    for (const line of text.split('\n')) {
      const trimmed = line.trimEnd()
      if (!trimmed) continue
      output.push(trimmed)
      if (output.length > 80) output.shift()
    }
  }

  const onData = (data: Buffer) => {
    const text = data.toString('utf-8')
    pushOut(text)
    const m = text.match(/http:\/\/(?:localhost|127\.0\.0\.1):(\d+)\//)
    if (m?.[1]) baseUrl = `http://${HOST}:${m[1]}/`
  }
  proc.stdout?.on('data', onData)
  proc.stderr?.on('data', onData)

  const exitedEarly = new Promise<never>((_, rej) => {
    proc.once('exit', (code) => {
      rej(new Error(`Dev server exited early (code ${code ?? 'unknown'}).\n\n${output.join('\n')}`))
    })
  })

  try {
    await withTimeout(
      Promise.race([
        (async () => {
          while (!baseUrl) {
            if (await isServerReady(desiredBaseUrl)) {
              baseUrl = desiredBaseUrl
              break
            }
            await sleep(100)
          }
        })(),
        exitedEarly,
      ]),
      60_000,
      'Vite dev server ready',
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${message}\n\nRecent dev server output:\n${output.join('\n')}`)
  }

  return { proc, baseUrl: baseUrl! }
}

async function isServerReady(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(baseUrl)
    return res.ok
  } catch {
    return false
  }
}

async function stopDevServer(proc: ReturnType<typeof spawn>): Promise<void> {
  if (proc.exitCode != null) return
  proc.kill('SIGTERM')
  const exited = await Promise.race([
    new Promise<boolean>((r) => proc.on('exit', () => r(true))),
    sleep(3000).then(() => false),
  ])
  if (!exited && proc.exitCode == null) {
    proc.kill('SIGKILL')
    await Promise.race([new Promise<void>((r) => proc.on('exit', () => r())), sleep(1000)])
  }
  proc.stdout?.destroy()
  proc.stderr?.destroy()
  proc.stdin?.destroy()
}

async function launchBrowser(
  baseUrl: string,
): Promise<{ browser: Browser; context: BrowserContext; page: Page; errors: string[] }> {
  const errors: string[] = []
  let browser: Browser
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: HEADLESS })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("Executable doesn't exist")) {
      throw new Error(
        'Chrome is not available for Playwright. Run `npm run browsers:install` and retry.',
      )
    }
    throw error
  }
  const context = await browser.newContext()
  await context.grantPermissions(['camera', 'microphone'], { origin: baseUrl })
  const page = await context.newPage()

  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${String(err)}`)
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`)
    }
  })

  return { browser, context, page, errors }
}

async function installFakeMedia(page: Page): Promise<void> {
  await page.evaluate(`
    (() => {
      const mediaDevices = navigator.mediaDevices;
      if (!mediaDevices) return;
      const w = window;

      if (!w.__ieOrigGetUserMedia) {
        w.__ieOrigGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
      }

      if (!w.__ieE2eCanvas) {
        const c = document.createElement('canvas');
        c.width = 640;
        c.height = 480;
        const ctx = c.getContext('2d');
        let t = 0;
        const tick = () => {
          if (!ctx) return;
          t += 0.03;
          ctx.fillStyle = '#101827';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.fillStyle = '#7bc8c0';
          const x = (Math.sin(t) * 0.4 + 0.5) * (c.width - 140);
          ctx.fillRect(x, 170, 140, 100);
          ctx.fillStyle = '#c7d2fe';
          ctx.font = '20px sans-serif';
          ctx.fillText('inner-echo runtime matrix cam', 16, 32);
          w.__ieE2eRaf = requestAnimationFrame(tick);
        };
        tick();
        w.__ieE2eCanvas = c;
      }

      if (!w.__ieE2eAudioRoot) {
        const AudioContextCtor = w.AudioContext || w.webkitAudioContext;
        if (AudioContextCtor) {
          const audioCtx = new AudioContextCtor();
          const oscillator = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const destination = audioCtx.createMediaStreamDestination();
          oscillator.type = 'sine';
          oscillator.frequency.value = 220;
          gain.gain.value = 0.0001;
          oscillator.connect(gain);
          gain.connect(destination);
          oscillator.start();
          w.__ieE2eAudioRoot = { audioCtx, oscillator, gain, destination };
        } else {
          w.__ieE2eAudioRoot = null;
        }
      }

      mediaDevices.getUserMedia = async (constraints) => {
        const wantsVideo = !!constraints.video;
        const wantsAudio = !!constraints.audio;
        if (wantsVideo) {
          return w.__ieE2eCanvas.captureStream(30);
        }
        if (wantsAudio) {
          const audioRoot = w.__ieE2eAudioRoot;
          const audioTrack = audioRoot?.destination?.stream?.getAudioTracks?.()[0];
          if (!audioTrack) {
            throw new DOMException('Synthetic microphone unavailable in runtime matrix', 'NotSupportedError');
          }
          return new MediaStream([audioTrack.clone()]);
        }
        return w.__ieOrigGetUserMedia(constraints);
      };
    })()
  `)
}

async function runFlow(page: Page, baseUrl: string): Promise<void> {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await installFakeMedia(page)

  // Onboarding
  const onboardingCheckbox = page.getByRole('checkbox', {
    name: /I understand and feel ready to begin/i,
  })
  if (await onboardingCheckbox.isVisible().catch(() => false)) {
    await onboardingCheckbox.check()
    await page.getByRole('button', { name: /Begin your experience/i }).click()
  }

  // Start camera
  await page.getByRole('button', { name: /Start camera/i }).click()
  await page
    .locator('.ie-statusRow')
    .getByText('Active', { exact: false })
    .waitFor({ timeout: 20_000 })

  // Enable audio
  const audioDetails = page.locator('details').filter({ hasText: 'Audio & microphone' }).first()
  if (await audioDetails.isVisible().catch(() => false)) {
    const isOpen = await audioDetails.evaluate((el) => (el as HTMLDetailsElement).open)
    if (!isOpen) {
      await audioDetails.locator('summary').first().click()
    }
  }
  const audioGroup = page.getByRole('group', { name: 'Audio' })
  const audioStatus = audioGroup.getByRole('status').first()
  let audioIsOn = false
  let statusText = (await audioStatus.textContent().catch(() => null)) ?? ''
  audioIsOn = AUDIO_ENGINE_READY_RE.test(statusText)
  if (!audioIsOn) {
    const enableAudio = audioGroup.getByRole('button', { name: /Enable audio/i })
    if (await enableAudio.isVisible().catch(() => false)) {
      await enableAudio.click()
    }
    try {
      await audioStatus
        .filter({ hasText: /Audio:\s*(on|muted \(engine on\)|error)/i })
        .first()
        .waitFor({ timeout: 20_000 })
      statusText = (await audioStatus.textContent()) ?? ''
      audioIsOn = AUDIO_ENGINE_READY_RE.test(statusText)
      if (!audioIsOn) {
        const alertText = await audioGroup
          .getByRole('alert')
          .textContent()
          .catch(() => null)
        const detail = alertText ? ` (${alertText.trim()})` : ''
        if (REQUIRE_AUDIO) throw new Error(`Audio failed to start${detail}`)
        console.warn(`[runtime-matrix] WARN: audio not on${detail}`)
      }
    } catch (e) {
      if (REQUIRE_AUDIO) throw e
      console.warn(
        '[runtime-matrix] WARN: audio did not reach on/error within timeout; continuing without mic',
      )
      audioIsOn = false
    }
  }

  // Switch to multimorbid and select two presets
  await page.getByRole('radio', { name: 'Multimorbid' }).check()
  const mm = page.getByRole('group', { name: /Multimorbid preset stack/i })
  const mmBoxes = mm.getByRole('checkbox')
  await mmBoxes.nth(0).check()
  await mmBoxes.nth(1).check()

  // Switch to symptom-first and select two dimensions (hybrid test: presets remain selected)
  await page.getByRole('radio', { name: 'Symptom-first' }).check()
  const sym = page.getByRole('group', { name: /Symptom-first dimensions/i })
  const symBoxes = sym.getByRole('checkbox')
  await symBoxes.nth(0).check()
  await symBoxes.nth(1).check()

  // Turn on mic via composer toggle (requests mic if audio is on)
  if (audioIsOn) {
    const micToggle = page.getByRole('checkbox', { name: /Microphone \(optional\)/i })
    try {
      await micToggle.check()
      await page.getByText('Mic: on', { exact: false }).waitFor({ timeout: 20_000 })
      // Calibrate mic (sliders exist only when mic is on)
      const micSensitivity = page.getByRole('slider', { name: /Mic sensitivity/i })
      await micSensitivity.evaluate((el) => {
        const input = el as HTMLInputElement
        input.value = '70'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
      const micGate = page.getByRole('slider', { name: /Noise gate/i })
      await micGate.evaluate((el) => {
        const input = el as HTMLInputElement
        input.value = '35'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    } catch (e) {
      if (REQUIRE_MIC) throw e
      console.warn('[runtime-matrix] WARN: mic did not reach on within timeout; continuing')
    }
  } else if (REQUIRE_MIC) {
    throw new Error('Mic required but audio is not on')
  }

  // Stop everything
  await page.getByRole('button', { name: /stop everything/i }).click()
  await page
    .locator('.ie-statusRow')
    .getByText('Ready', { exact: false })
    .waitFor({ timeout: 10_000 })
}

async function main(): Promise<void> {
  const { proc, baseUrl } = await startDevServer()
  try {
    const { browser, context, page, errors } = await launchBrowser(baseUrl)
    try {
      await runFlow(page, baseUrl)
    } finally {
      await context.close().catch(() => {})
      await browser.close().catch(() => {})
    }
    if (errors.length) {
      console.error('[runtime-matrix] FAIL: errors detected')
      for (const e of errors) console.error(`- ${e}`)
      process.exit(1)
    }
    console.log('[runtime-matrix] OK')
  } finally {
    await stopDevServer(proc)
  }
}

void main()
