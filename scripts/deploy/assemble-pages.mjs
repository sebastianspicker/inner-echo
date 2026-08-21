import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pagesContentSecurityPolicy } from './pages-config.mjs'

const root = resolve(import.meta.dirname, '../..')
const output = resolve(root, 'dist')
const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${pagesContentSecurityPolicy};" />`

async function injectPagesCsp(path) {
  const html = await readFile(path, 'utf8')
  if (html.includes('http-equiv="Content-Security-Policy"')) {
    throw new Error(`Pages CSP is already present in ${path}`)
  }
  const charsetLine = html.match(/^(\s*)<meta charset=[^>]+>$/m)
  if (!charsetLine) throw new Error(`Missing charset meta element in ${path}`)

  await writeFile(
    path,
    html.replace(charsetLine[0], `${charsetLine[0]}\n${charsetLine[1]}${cspMeta}`),
  )
}

await writeFile(resolve(output, '.nojekyll'), '')

await injectPagesCsp(resolve(output, 'index.html'))

console.log('Pages artifact assembled with the live app at the root.')
