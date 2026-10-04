import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const publicRootFiles = ['README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'PRODUCT.md']
const publicDirectories = ['.github', 'docs', 'src/content/experience']

function markdownFiles(directory) {
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory() && path.relative(root, fullPath) === 'docs/archive') continue
    if (entry.isDirectory()) files.push(...markdownFiles(fullPath))
    else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'AUDIT.md') {
      files.push(fullPath)
    }
  }
  return files
}

function normalizeTarget(rawTarget) {
  let target = rawTarget.trim()
  if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1)
  else target = target.split(/\s+["']/u, 1)[0]
  return target
}

// Backticked repository paths such as `src/runtime/session/` must exist too, so prose cannot
// keep pointing at moved or deleted code. Globs and placeholders are skipped.
const repoPathSpan = /`((?:src|tools|tests|docs|public|demo|assets)\/[^`\s]*)`/gu

function isConcreteRepoPath(target) {
  return !/[*{}<>$]/u.test(target)
}

// Superseded decision records keep their historical Governs paths.
function isSupersededRecord(text) {
  return /^- Status: superseded/mu.test(text)
}

function isExternal(target) {
  return /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/iu.test(target)
}

const missing = []
let checked = 0

const maintainedFiles = [
  ...publicRootFiles.map((filePath) => path.join(root, filePath)).filter((f) => fs.existsSync(f)),
  ...publicDirectories.flatMap((directory) => markdownFiles(path.join(root, directory))),
]

for (const filePath of maintainedFiles) {
  const text = fs.readFileSync(filePath, 'utf8')
  const targets = []
  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/gu)) targets.push(match[1])
  for (const match of text.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gmu)) targets.push(match[1])

  for (const rawTarget of targets) {
    const target = normalizeTarget(rawTarget)
    if (!target || isExternal(target)) continue
    const withoutFragment = target.split('#', 1)[0]
    if (!withoutFragment) continue
    checked += 1
    const resolved = path.resolve(path.dirname(filePath), decodeURIComponent(withoutFragment))
    if (!fs.existsSync(resolved)) {
      missing.push(`${path.relative(root, filePath)} -> ${target}`)
    }
  }
  if (isSupersededRecord(text)) continue
  for (const match of text.matchAll(repoPathSpan)) {
    const target = match[1]
    if (!isConcreteRepoPath(target)) continue
    checked += 1
    if (!fs.existsSync(path.join(root, target))) {
      missing.push(`${path.relative(root, filePath)} -> \`${target}\``)
    }
  }
}

if (missing.length > 0) {
  for (const item of missing) console.error(`[docs:links] ${item}`)
  process.exit(1)
}

console.log(`[docs:links] OK (${checked} local targets)`)
