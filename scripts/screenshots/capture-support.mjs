import fs from 'node:fs/promises'
import path from 'node:path'

export async function readScreenshotManifest(manifestPath) {
  const parsed = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  if (!parsed || !Array.isArray(parsed.shots)) {
    throw new Error('Invalid screenshot manifest: missing shots array')
  }
  if (parsed.shots.length !== 10) {
    throw new Error(`Expected 10 shots in manifest, found ${parsed.shots.length}`)
  }
  return parsed
}

export function screenshotById(manifest) {
  const byId = new Map(manifest.shots.map((shot) => [shot.id, shot]))
  return (id) => {
    const shot = byId.get(id)
    if (!shot) throw new Error(`Shot missing from manifest: ${id}`)
    return shot
  }
}

export async function captureShot(page, outputDirectory, shot) {
  const outputPath = path.join(outputDirectory, `${shot.baseName}.png`)
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        window.scrollTo(0, 0)
        requestAnimationFrame(() => resolve(null))
      }),
  )
  await page.screenshot({ path: outputPath, fullPage: false })
  const stat = await fs.stat(outputPath)
  if (!stat.isFile() || stat.size <= 0)
    throw new Error(`Failed to create screenshot: ${outputPath}`)
  console.log(`[screenshots:capture] ${shot.id}`)
}

export async function revealInPanel(locator) {
  await locator.evaluate((element) => {
    const panel = element.closest('.ie-panelScroll')
    if (!(panel instanceof HTMLElement)) return
    const panelRect = panel.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    panel.scrollTop += elementRect.top - panelRect.top - 16
  })
}

export async function ensureDetailsOpen(page, summaryText) {
  const summary = page.locator(`summary:has-text("${summaryText}")`).first()
  await revealInPanel(summary)
  const isOpen = await summary.evaluate(
    (element) => element.closest('details')?.hasAttribute('open') ?? false,
  )
  if (!isOpen) await summary.click()
}
