import { readdir, readFile, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'

const output = resolve(import.meta.dirname, '../..', 'dist')
const failures = []
const manifestPath = resolve(output, 'manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const html = await readFile(resolve(output, 'index.html'), 'utf8')
const document = new JSDOM(html).window.document

const initialAssets = Array.from(
  document.querySelectorAll('script[src], link[rel="modulepreload"]'),
)
  .map((element) => element.getAttribute('src') ?? element.getAttribute('href') ?? '')
  .filter(Boolean)

for (const asset of initialAssets) {
  if (/three(?:\.core)?-/i.test(asset)) {
    failures.push(`initial HTML eagerly loads the deferred Three.js runtime: ${asset}`)
  }
}

function staticClosure(initialKeys) {
  const seen = new Set()
  const pending = [...initialKeys]
  while (pending.length > 0) {
    const key = pending.pop()
    if (!key || seen.has(key)) continue
    seen.add(key)
    pending.push(...(manifest[key]?.imports ?? []))
  }
  return seen
}

const entryKey = Object.keys(manifest).find((key) => manifest[key]?.isEntry)
const graphKey = Object.keys(manifest).find(
  (key) => manifest[key]?.src === 'src/runtime/visual/graph/index.ts',
)

if (!entryKey) failures.push('Vite manifest has no application entry')
if (!graphKey) failures.push('Vite manifest has no lazy visual graph entry')

const entryClosure = entryKey ? staticClosure([entryKey]) : new Set()
for (const key of entryClosure) {
  const chunk = manifest[key]
  const identity = `${key} ${chunk?.src ?? ''} ${chunk?.file ?? ''} ${chunk?.name ?? ''}`
  if (/three(?:\.core)?|runtime\/visual\/(?:effects|graph)/i.test(identity)) {
    failures.push(`initial static bundle closure contains deferred visual runtime: ${identity}`)
  }
}

if (graphKey) {
  const graphClosure = staticClosure([graphKey])
  const ownsThree = [...graphClosure].some((key) => {
    const chunk = manifest[key]
    return /three(?:\.core)?/i.test(
      `${key} ${chunk?.src ?? ''} ${chunk?.file ?? ''} ${chunk?.name ?? ''}`,
    )
  })
  if (!ownsThree) failures.push('lazy visual graph closure does not own its Three.js dependency')
}

const assetDirectory = resolve(output, 'assets')
const assetNames = await readdir(assetDirectory)
const productionSources = await Promise.all(
  assetNames
    .filter((name) => name.endsWith('.js'))
    .map((name) => readFile(resolve(assetDirectory, name), 'utf8')),
)
const productionText = productionSources.join('\n')
for (const developmentMarker of [
  'Debug (dev only)',
  'Throw test error from Debug Panel',
  'stress-mode-desc',
]) {
  if (productionText.includes(developmentMarker)) {
    failures.push(`development-only marker found in production JavaScript: ${developmentMarker}`)
  }
}

if (failures.length > 0) {
  console.error([...new Set(failures)].join('\n'))
  process.exitCode = 1
} else {
  await unlink(manifestPath)
  console.log(
    '[bundle:verify] Three.js remains behind the lazy graph boundary; dev-only diagnostics are absent.',
  )
}
