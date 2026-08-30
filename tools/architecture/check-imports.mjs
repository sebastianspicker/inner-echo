import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, normalize, relative, resolve, sep } from 'node:path'

const root = process.cwd()
const sourceRoot = resolve(root, 'src')
const sourceExtensions = ['.ts', '.tsx']
const importPattern =
  /(?:import\s+(?:type\s+)?[^'"`]*?from\s*|export\s+[^'"`]*?from\s*|import\s*\(\s*)['"`]([^'"`]+)['"`]/g

function collectSourceFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...collectSourceFiles(path))
    else if (sourceExtensions.includes(extname(entry.name))) files.push(path)
  }
  return files
}

function resolveSourceImport(importer, specifier) {
  if (!specifier.startsWith('.')) return null
  const candidate = resolve(dirname(importer), specifier)
  const attempts = [
    candidate,
    ...sourceExtensions.map((extension) => `${candidate}${extension}`),
    ...sourceExtensions.map((extension) => resolve(candidate, `index${extension}`)),
  ]
  return (
    attempts.find(
      (attempt) => existsSync(attempt) && sourceExtensions.includes(extname(attempt)),
    ) ?? null
  )
}

function sourcePath(path) {
  return relative(root, path).split(sep).join('/')
}

function layer(path) {
  const [, first] = sourcePath(path).split('/')
  if (['app', 'content', 'domain', 'runtime', 'platform', 'shared'].includes(first)) return first
  return 'entry'
}

const allowedDependencies = {
  app: new Set(['app', 'content', 'domain', 'runtime', 'platform', 'shared']),
  content: new Set(['content', 'domain', 'platform', 'shared']),
  domain: new Set(['domain', 'shared']),
  runtime: new Set(['runtime', 'domain', 'platform', 'shared']),
  platform: new Set(['platform', 'shared']),
  shared: new Set(['shared']),
  entry: new Set(['app', 'platform', 'shared', 'entry']),
}

const files = collectSourceFiles(sourceRoot)
const graph = new Map(files.map((file) => [file, []]))
const violations = []

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(importPattern)) {
    const imported = resolveSourceImport(file, match[1])
    if (!imported || !imported.startsWith(`${sourceRoot}${sep}`)) continue
    graph.get(file).push(imported)
    const fromLayer = layer(file)
    const toLayer = layer(imported)
    if (!allowedDependencies[fromLayer].has(toLayer)) {
      violations.push(`${sourcePath(file)} (${fromLayer}) -> ${sourcePath(imported)} (${toLayer})`)
    }
  }
}

let nextIndex = 0
const stack = []
const onStack = new Set()
const indices = new Map()
const lowLinks = new Map()
const cycles = []

function visit(file) {
  indices.set(file, nextIndex)
  lowLinks.set(file, nextIndex)
  nextIndex += 1
  stack.push(file)
  onStack.add(file)

  for (const dependency of graph.get(file) ?? []) {
    if (!indices.has(dependency)) {
      visit(dependency)
      lowLinks.set(file, Math.min(lowLinks.get(file), lowLinks.get(dependency)))
    } else if (onStack.has(dependency)) {
      lowLinks.set(file, Math.min(lowLinks.get(file), indices.get(dependency)))
    }
  }

  if (lowLinks.get(file) !== indices.get(file)) return
  const component = []
  while (stack.length > 0) {
    const member = stack.pop()
    onStack.delete(member)
    component.push(member)
    if (member === file) break
  }
  const selfCycle = component.length === 1 && (graph.get(component[0]) ?? []).includes(component[0])
  if (component.length > 1 || selfCycle) cycles.push(component.map(sourcePath).sort())
}

for (const file of files) if (!indices.has(file)) visit(file)

if (violations.length > 0 || cycles.length > 0) {
  if (violations.length > 0) {
    console.error('[architecture] Forbidden dependency directions:')
    for (const violation of violations.sort()) console.error(`- ${violation}`)
  }
  if (cycles.length > 0) {
    console.error('[architecture] Import cycles:')
    for (const cycle of cycles) console.error(`- ${cycle.join(' -> ')}`)
  }
  process.exitCode = 1
} else {
  console.log(`[architecture] OK (${files.length} modules, no forbidden edges or cycles)`)
}
