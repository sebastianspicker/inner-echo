import { execFileSync } from 'node:child_process'
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

// Git-ignored paths (the private tests, agent notes, build output) never reach a clean clone or
// CI, so a reference to one must fail here too rather than pass only on a developer machine.
// Outside a git work tree (for example an exported archive) there is nothing ignored to exclude.
function listIgnoredPaths() {
  if (!fs.existsSync(path.join(root, '.git'))) return []
  const output = execFileSync(
    'git',
    ['ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z'],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  )
  return output
    .split('\0')
    .filter(Boolean)
    .map((entry) => path.resolve(root, entry))
}

const ignoredPaths = listIgnoredPaths()

function isAvailable(resolved) {
  if (!fs.existsSync(resolved)) return false
  return !ignoredPaths.some(
    (ignored) => resolved === ignored || resolved.startsWith(`${ignored}${path.sep}`),
  )
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
    let decoded
    try {
      decoded = decodeURIComponent(withoutFragment)
    } catch {
      // A malformed escape such as `100%.md` cannot name a file; report it instead of crashing.
      missing.push(`${path.relative(root, filePath)} -> ${target}`)
      continue
    }
    const resolved = path.resolve(path.dirname(filePath), decoded)
    if (!isAvailable(resolved)) {
      missing.push(`${path.relative(root, filePath)} -> ${target}`)
    }
  }
  if (isSupersededRecord(text)) continue
  for (const match of text.matchAll(repoPathSpan)) {
    const target = match[1]
    if (!isConcreteRepoPath(target)) continue
    checked += 1
    if (!isAvailable(path.join(root, target))) {
      missing.push(`${path.relative(root, filePath)} -> \`${target}\``)
    }
  }
}

if (missing.length > 0) {
  for (const item of missing) console.error(`[docs:links] ${item}`)
  process.exit(1)
}

console.log(`[docs:links] OK (${checked} local targets)`)
