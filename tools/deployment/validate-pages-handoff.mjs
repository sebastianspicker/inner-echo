import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { validateHandoff } from './pages-handoff.mjs'

const root = resolve(import.meta.dirname, '../..')
const metadata = JSON.parse(
  await readFile(resolve(root, 'reports/pages-handoff/candidate.json'), 'utf8'),
)
await validateHandoff(metadata, resolve(root, 'dist'), process.env)
console.log(
  'Pages candidate matches the CI run, current main, current base path, and verified site bytes.',
)
