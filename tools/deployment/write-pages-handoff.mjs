import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHandoff } from './pages-handoff.mjs'

const root = resolve(import.meta.dirname, '../..')
const metadata = await createHandoff(resolve(root, 'dist'), process.env)
const handoff = resolve(root, 'reports/pages-handoff')
await mkdir(handoff, { recursive: true })
await writeFile(resolve(handoff, 'candidate.json'), `${JSON.stringify(metadata, null, 2)}\n`)
console.log('Verified Pages candidate identity recorded outside the site.')
