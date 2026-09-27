import { readdir, readFile, writeFile } from 'node:fs/promises'
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

async function listHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) return listHtmlFiles(path)
      return entry.name.endsWith('.html') ? [path] : []
    }),
  )
  return nested.flat()
}

await writeFile(resolve(output, '.nojekyll'), '')

const htmlFiles = await listHtmlFiles(output)
await Promise.all(htmlFiles.map(injectPagesCsp))

console.log(`Pages artifact assembled with CSP fallbacks in ${htmlFiles.length} HTML entries.`)
