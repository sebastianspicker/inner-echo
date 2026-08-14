import { access, readdir, readFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import { JSDOM } from 'jsdom'
import { getPagesBasePath, pagesContentSecurityPolicy } from './pages-config.mjs'

const root = resolve(import.meta.dirname, '../..')
const output = resolve(root, 'dist')
const basePath = getPagesBasePath()
const failures = []

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
  '.nojekyll',
  'THIRD_PARTY_NOTICES.txt',
  'third-party-licenses',
  'demo/index.html',
  'demo/demo.css',
  'demo/demo.js',
]) {
  await requirePath(path)
}

const rootHtml = await readFile(resolve(output, 'index.html'), 'utf8')
const demoHtml = await readFile(resolve(output, 'demo/index.html'), 'utf8')
const rootDocument = new JSDOM(rootHtml).window.document
const demoDocument = new JSDOM(demoHtml).window.document

verifyCsp(rootDocument, 'index.html')
verifyCsp(demoDocument, 'demo/index.html')
await verifyAssetReferences(rootDocument, 'index.html', `https://pages.invalid${basePath}`)
await verifyAssetReferences(
  demoDocument,
  'demo/index.html',
  `https://pages.invalid${basePath}demo/`,
)

if (!rootDocument.querySelector('script[type="module"]')) {
  failures.push('index.html: missing the live application module')
}
if (!demoDocument.body.textContent?.includes('Static demo')) {
  failures.push('demo/index.html: missing the static-demo boundary label')
}

const files = await listFiles(output)
const relativeFiles = files.map((path) => relative(output, path).split(sep).join('/'))
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
    `Pages artifact verification passed for ${basePath}: live assets stay under the base path, the demo is isolated, CSP fallbacks are present, and no source maps or local paths are published.`,
  )
}
