import { spawnSync } from 'node:child_process'
import { getPagesBasePath } from './pages-config.mjs'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function runScript(name, arguments_ = []) {
  const result = spawnSync(npmCommand, ['run', name, '--', ...arguments_], {
    stdio: 'inherit',
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const basePath = getPagesBasePath()

console.log(`Building the GitHub Pages artifact for ${basePath}`)
runScript('build', [`--base=${basePath}`])
runScript('demo:build')
await import('./assemble-pages.mjs')
