import { access, readdir, readFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import { JSDOM } from 'jsdom'
import { demoAllowedLayers, listSourceLayers } from '../architecture/layers.mjs'
import {
  collectChunkClosure,
  findForbiddenCapabilitiesInChunkClosure,
  findForbiddenDemoFrameworks,
} from './demo-artifact-policy.mjs'
import { getPagesBasePath, pagesContentSecurityPolicy } from './pages-config.mjs'

const root = resolve(import.meta.dirname, '../..')
const output = resolve(root, 'dist')
const basePath = getPagesBasePath()
const failures = []
const forbiddenDemoLayers = listSourceLayers(root).filter((layer) => !demoAllowedLayers.has(layer))
const forbiddenDemoLayerPattern = new RegExp(`src/(?:${forbiddenDemoLayers.join('|')})/`)

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name)
      return entry.isDirectory() ? listFiles(path) : [path]
    }),
  )
  return nested.flat()
}

async function requirePath(path) {
  try {
    await access(resolve(output, path))
  } catch {
    failures.push(`missing Pages artifact path: ${path}`)
  }
}

function verifyCsp(document, path) {
  const policies = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')
  if (policies.length !== 1) {
    failures.push(`${path}: expected exactly one Pages CSP meta element`)
    return
  }

  const content = policies[0]?.getAttribute('content') ?? ''
  if (content !== `${pagesContentSecurityPolicy};`) {
    failures.push(`${path}: Pages CSP differs from the deployment policy`)
  }
  if (content.includes('frame-ancestors')) {
    failures.push(`${path}: meta CSP must not claim header-only frame-ancestors protection`)
  }

  const firstLoad = document.querySelector('script[src], link[href]')
  if (firstLoad && policies[0]?.compareDocumentPosition(firstLoad) !== 4) {
    failures.push(`${path}: Pages CSP must appear before load-bearing elements`)
  }
}

async function verifyAssetReferences(document, documentPath, documentUrl) {
  const artifactPaths = []

  for (const element of document.querySelectorAll('[src], link[href]')) {
    const reference = element.getAttribute('src') ?? element.getAttribute('href')
    if (!reference || /^(?:data:|blob:|#)/.test(reference)) continue

    const url = new URL(reference, documentUrl)
    if (url.origin !== 'https://pages.invalid') {
      failures.push(`${documentPath}: external asset is not allowed: ${reference}`)
      continue
    }
    if (!url.pathname.startsWith(basePath)) {
      failures.push(`${documentPath}: asset escapes ${basePath}: ${reference}`)
      continue
    }

    const artifactPath = decodeURIComponent(url.pathname.slice(basePath.length))
    if (artifactPath) artifactPaths.push(artifactPath)
  }

  await Promise.all(artifactPaths.map(requirePath))
}

for (const path of [
  'index.html',
  'demo/index.html',
  'manifest.json',
  '.nojekyll',
  'THIRD_PARTY_NOTICES.txt',
  'third-party-licenses',
]) {
  await requirePath(path)
}

const files = await listFiles(output)
const relativeFiles = files.map((path) => relative(output, path).split(sep).join('/'))
const htmlPaths = relativeFiles.filter((path) => path.endsWith('.html'))

await Promise.all(
  htmlPaths.map(async (path) => {
    const html = await readFile(resolve(output, path), 'utf8')
    const document = new JSDOM(html).window.document
    const documentPath = path === 'index.html' ? '' : path

    verifyCsp(document, path)
    await verifyAssetReferences(document, path, `https://pages.invalid${basePath}${documentPath}`)

    if (!document.querySelector('script[type="module"]')) {
      failures.push(`${path}: missing an application module`)
    }
    if (path === 'demo/index.html' && document.querySelector('video, audio')) {
      failures.push(`${path}: mock demo must not contain live media elements`)
    }
  }),
)

const manifest = JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8'))
const applicationEntry = Object.keys(manifest).find(
  (key) => manifest[key]?.isEntry && manifest[key]?.src === 'index.html',
)
const demoEntry = Object.keys(manifest).find(
  (key) => manifest[key]?.isEntry && manifest[key]?.src === 'demo/index.html',
)

if (!applicationEntry) failures.push('manifest.json: missing the live application entry')
if (!demoEntry) failures.push('manifest.json: missing the mock demo entry')

if (demoEntry) {
  const demoClosure = collectChunkClosure(manifest, [demoEntry])
  for (const key of demoClosure) {
    const chunk = manifest[key]
    const identity = `${key} ${chunk?.src ?? ''} ${chunk?.file ?? ''}`
    if (forbiddenDemoLayerPattern.test(identity) || /(?:^|\/)main-/.test(identity)) {
      failures.push(`mock demo bundle reaches a production application chunk: ${identity}`)
    }
  }

  const demoSources = await Promise.all(
    demoClosure.map(async (key) => {
      const path = manifest[key]?.file
      if (typeof path !== 'string' || !path.endsWith('.js')) return [key, '']
      return [key, await readFile(resolve(output, path), 'utf8')]
    }),
  )
  const demoSourcesByChunk = new Map(demoSources)
  const demoSource = [...demoSourcesByChunk.values()].join('\n')
  for (const forbiddenFramework of findForbiddenDemoFrameworks(demoSource)) {
    failures.push(`mock demo static bundle contains forbidden ${forbiddenFramework}`)
  }
  for (const forbiddenCapability of findForbiddenCapabilitiesInChunkClosure(
    manifest,
    [demoEntry],
    demoSourcesByChunk,
  )) {
    failures.push(`mock demo static bundle contains forbidden ${forbiddenCapability} capability`)
  }
}

const hiddenFiles = relativeFiles.filter((path) =>
  path.split('/').some((part) => part.startsWith('.')),
)

if (hiddenFiles.length !== 1 || hiddenFiles[0] !== '.nojekyll') {
  failures.push(`unexpected hidden artifact paths: ${hiddenFiles.join(', ') || '(none)'}`)
}

for (const path of relativeFiles) {
  if (path.endsWith('.map')) failures.push(`source map must not be published: ${path}`)
}

for (const path of relativeFiles.filter((entry) => /\.(?:css|html|js|json|txt)$/.test(entry))) {
  const content = await readFile(resolve(output, path), 'utf8')
  if (
    /file:\/\/|\/Users\/|\/home\/runner\/work\/|[A-Za-z]:\\(?:Users|workspace|work)\\/.test(content)
  ) {
    failures.push(`local filesystem path found in artifact: ${path}`)
  }
  if (basePath !== '/' && /["'(]\/assets\//.test(content)) {
    failures.push(`root-absolute asset reference found in artifact: ${path}`)
  }
}

if (failures.length > 0) {
  console.error([...new Set(failures)].join('\n'))
  process.exitCode = 1
} else {
  console.log(
    `Pages artifact verification passed for ${basePath}: live and mock-demo assets stay under the base path, each HTML entry has the CSP fallback, the demo bundle is device-free, and no source maps or local paths are published.`,
  )
}
